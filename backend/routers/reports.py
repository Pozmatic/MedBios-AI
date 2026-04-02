"""
MedBios AI — Reports API Router
Handles report upload, analysis, and retrieval.
"""
import logging
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import Patient, Report, LabResult, ClinicalInsight
from services.pipeline import run_full_pipeline_async
from services.knowledge_graph import get_full_graph_stats, get_subgraph, query_related
from services.trend_analysis import get_patient_trends
from services.drug_interactions import run_full_interaction_check

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload")
async def upload_report(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a medical report PDF for AI-powered analysis.
    
    Runs the full pipeline: OCR → NLP → Reasoning → Knowledge Graph → Report
    """
    # Validate file type
    allowed_types = [
        "application/pdf",
        "image/png", "image/jpeg", "image/jpg",
        "application/octet-stream",  # Some clients send this for PDFs
    ]
    if file.content_type not in allowed_types and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload a PDF or image file."
        )

    # Read file
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    if len(file_bytes) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 50MB.")

    # Run analysis pipeline
    try:
        result = await run_full_pipeline_async(file_bytes, filename=file.filename)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    if result.get("status") == "error":
        raise HTTPException(status_code=422, detail=result.get("error", "Analysis failed"))

    # ── Persist to database ──
    try:
        # Create or find patient
        patient_info = result.get("patient_info", {})
        patient = Patient(
            name=patient_info.get("name"),
            age=patient_info.get("age"),
            gender=patient_info.get("gender"),
        )
        db.add(patient)
        await db.flush()

        # Create report
        report = Report(
            patient_id=patient.id,
            filename=file.filename,
            document_type=result.get("document_type", "unknown"),
            raw_text=result.get("raw_text", ""),
            status="completed",
            analysis_result=result.get("clinical_report"),
        )
        db.add(report)
        await db.flush()

        # Store lab results
        for lab in result.get("lab_values", []):
            lab_result = LabResult(
                report_id=report.id,
                test_name=lab.get("canonical_name", lab.get("test_name", "")),
                value=lab.get("value"),
                unit=lab.get("unit") or lab.get("expected_unit"),
                reference_min=lab.get("reference_min"),
                reference_max=lab.get("reference_max"),
                status=lab.get("status", "normal"),
                raw_text=lab.get("raw_text", ""),
            )
            db.add(lab_result)

        # Store clinical insights
        for insight in result.get("insights", []):
            clinical_insight = ClinicalInsight(
                report_id=report.id,
                condition=insight.get("condition", ""),
                confidence=insight.get("confidence", "low"),
                category=insight.get("category", ""),
                evidence=insight.get("evidence"),
                reasoning=insight.get("reasoning", ""),
                recommendation=insight.get("recommendation", ""),
            )
            db.add(clinical_insight)

        await db.commit()
        result["report_id"] = report.id
        result["patient_id"] = patient.id

    except Exception as e:
        logger.error(f"Database save failed: {e}")
        await db.rollback()
        # Still return results even if DB save fails
        result["db_warning"] = "Results generated but database save failed"

    # Remove raw_text from response (too large)
    result.pop("raw_text", None)

    return result


@router.get("/")
async def list_reports(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """List all analyzed reports with pagination."""
    # Get total count
    total = (await db.execute(select(func.count(Report.id)))).scalar() or 0

    # Paginated query
    offset = (page - 1) * page_size
    query = select(Report).order_by(Report.created_at.desc()).offset(offset).limit(page_size)
    results = await db.execute(query)
    reports = results.scalars().all()

    return {
        "items": [
            {
                "id": r.id,
                "filename": r.filename,
                "document_type": r.document_type,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reports
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{report_id}")
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """Get full analysis results for a specific report."""
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get lab results
    lab_query = select(LabResult).where(LabResult.report_id == report_id)
    lab_results = (await db.execute(lab_query)).scalars().all()

    # Get insights
    insight_query = select(ClinicalInsight).where(ClinicalInsight.report_id == report_id)
    insights = (await db.execute(insight_query)).scalars().all()

    # Get patient
    patient = None
    if report.patient_id:
        patient_query = select(Patient).where(Patient.id == report.patient_id)
        patient = (await db.execute(patient_query)).scalar_one_or_none()

    # Build lab values in same shape as pipeline output
    lab_values = [
        {
            "test_name": lr.test_name,
            "canonical_name": lr.test_name,
            "value": lr.value,
            "unit": lr.unit,
            "status": lr.status,
            "reference_min": lr.reference_min,
            "reference_max": lr.reference_max,
        }
        for lr in lab_results
    ]

    abnormal_count = sum(1 for lv in lab_values if lv["status"] != "normal")

    # Extract risk_scores and other data from stored clinical_report
    clinical_report = report.analysis_result or {}
    risk_scores_data = clinical_report.get("risk_scores", {})

    # Build risk_scores in same shape as pipeline output
    risk_scores = {
        "overall": clinical_report.get("summary", {}).get("overall_risk", 0),
        "overall_level": "high" if clinical_report.get("summary", {}).get("overall_risk", 0) > 60 else "moderate",
        "organ_systems": risk_scores_data,
    }

    # Get knowledge graph subgraph for tests found in this report
    test_names = [lr.test_name for lr in lab_results if lr.status != "normal"]
    kg_data = None
    graph_risks = []
    try:
        if test_names:
            kg_data = get_subgraph(test_names[:10], depth=2)
    except Exception:
        pass  # KG is optional

    insights_list = [
        {
            "condition": ins.condition,
            "confidence": ins.confidence,
            "category": ins.category,
            "evidence": ins.evidence,
            "reasoning": ins.reasoning,
            "recommendation": ins.recommendation,
        }
        for ins in insights
    ]

    return {
        "id": report.id,
        "filename": report.filename,
        "document_type": report.document_type,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "patient_info": {
            "name": patient.name if patient else None,
            "age": patient.age if patient else None,
            "gender": patient.gender if patient else None,
        },
        "clinical_report": clinical_report,
        "lab_values": lab_values,
        "abnormal_count": abnormal_count,
        "insights": insights_list,
        "risk_scores": risk_scores,
        "knowledge_graph": kg_data,
        "graph_risks": graph_risks,
    }



@router.get("/knowledge-graph/stats")
async def knowledge_graph_stats():
    """Get knowledge graph statistics."""
    return get_full_graph_stats()


@router.get("/knowledge-graph/query/{entity}")
async def knowledge_graph_query(entity: str, depth: int = 2):
    """Query related entities in the knowledge graph."""
    related = query_related(entity, max_depth=depth)
    subgraph = get_subgraph([entity], depth=depth)
    return {
        "entity": entity,
        "related": related,
        "graph": subgraph,
    }


# ── Trend Analysis ──────────────────────────────────────────

@router.get("/patient/{patient_id}/trends")
async def patient_trends(patient_id: str, db: AsyncSession = Depends(get_db)):
    """Get longitudinal trend analysis for a patient across all their reports."""
    # Get all reports for this patient
    report_query = select(Report).where(Report.patient_id == patient_id).order_by(Report.created_at)
    reports = (await db.execute(report_query)).scalars().all()

    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this patient")

    # Build report data with lab values
    reports_data = []
    for report in reports:
        lab_query = select(LabResult).where(LabResult.report_id == report.id)
        lab_results = (await db.execute(lab_query)).scalars().all()

        reports_data.append({
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "lab_values": [
                {
                    "test_name": lr.test_name,
                    "value": lr.value,
                    "status": lr.status,
                }
                for lr in lab_results
            ],
        })

    return get_patient_trends(reports_data)


# ── Drug Interaction Detection ──────────────────────────────

@router.post("/drug-interactions/check")
async def check_drug_interactions(payload: dict):
    """
    Check for drug-drug interactions.
    Body: { "medications": ["warfarin", "aspirin", "metformin"] }
    """
    medications = payload.get("medications", [])
    if not medications:
        raise HTTPException(status_code=400, detail="Please provide a list of medications")

    return run_full_interaction_check(medications)


@router.post("/drug-interactions/lab-check")
async def check_drug_lab_interactions(payload: dict):
    """
    Check for drug-lab interactions with patient's current lab values.
    Body: {
        "medications": ["metformin", "lisinopril"],
        "lab_values": [{"test_name": "potassium", "value": 5.4, "status": "high"}]
    }
    """
    medications = payload.get("medications", [])
    lab_values = payload.get("lab_values", [])

    if not medications:
        raise HTTPException(status_code=400, detail="Please provide a list of medications")

    return run_full_interaction_check(medications, lab_values)


# ── Analytics Dashboard ─────────────────────────────────────

@router.get("/analytics/dashboard")
async def analytics_dashboard(db: AsyncSession = Depends(get_db)):
    """Get aggregate analytics for the dashboard."""
    # Total counts
    total_reports = (await db.execute(select(func.count(Report.id)))).scalar() or 0
    total_patients = (await db.execute(select(func.count(Patient.id)))).scalar() or 0
    total_lab_tests = (await db.execute(select(func.count(LabResult.id)))).scalar() or 0
    total_insights = (await db.execute(select(func.count(ClinicalInsight.id)))).scalar() or 0

    # Abnormal count
    abnormal_count = (await db.execute(
        select(func.count(LabResult.id)).where(LabResult.status != "normal")
    )).scalar() or 0

    # Category breakdown (insights by category)
    cat_query = select(
        ClinicalInsight.category,
        func.count(ClinicalInsight.id).label("count"),
    ).group_by(ClinicalInsight.category)
    cat_results = (await db.execute(cat_query)).all()
    category_breakdown = {row[0]: row[1] for row in cat_results}

    # Confidence breakdown
    conf_query = select(
        ClinicalInsight.confidence,
        func.count(ClinicalInsight.id).label("count"),
    ).group_by(ClinicalInsight.confidence)
    conf_results = (await db.execute(conf_query)).all()
    confidence_breakdown = {row[0]: row[1] for row in conf_results}

    # Recent reports (last 5)
    recent_query = select(Report).order_by(Report.created_at.desc()).limit(5)
    recent = (await db.execute(recent_query)).scalars().all()
    recent_reports = [
        {
            "id": r.id,
            "filename": r.filename,
            "document_type": r.document_type,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent
    ]

    # Average risk score — only fetch analysis_result column, paginate to avoid memory issues
    risk_scores = []
    risk_q = select(Report.analysis_result).where(Report.analysis_result.isnot(None)).limit(500)
    risk_rows = (await db.execute(risk_q)).all()
    for (analysis_result,) in risk_rows:
        if analysis_result and isinstance(analysis_result, dict):
            summary = analysis_result.get("summary", {})
            risk = summary.get("overall_risk", 0)
            if risk:
                risk_scores.append(risk)

    avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0

    # Knowledge graph stats
    kg_stats = get_full_graph_stats()

    return {
        "total_reports": total_reports,
        "total_patients": total_patients,
        "total_lab_tests": total_lab_tests,
        "total_insights": total_insights,
        "abnormal_count": abnormal_count,
        "abnormal_rate": round(abnormal_count / max(total_lab_tests, 1) * 100, 1),
        "category_breakdown": category_breakdown,
        "confidence_breakdown": confidence_breakdown,
        "avg_risk_score": avg_risk,
        "recent_reports": recent_reports,
        "knowledge_graph": kg_stats,
    }


# ── PDF Clinical Report Export ──────────────────────────────

@router.get("/export/{report_id}/pdf")
async def export_report_pdf(report_id: str, db: AsyncSession = Depends(get_db)):
    """Generate and download a clinical report as PDF."""
    # Fetch report data
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get related data
    lab_query = select(LabResult).where(LabResult.report_id == report_id)
    lab_results = (await db.execute(lab_query)).scalars().all()

    insight_query = select(ClinicalInsight).where(ClinicalInsight.report_id == report_id)
    insights = (await db.execute(insight_query)).scalars().all()

    patient = None
    if report.patient_id:
        patient_query = select(Patient).where(Patient.id == report.patient_id)
        patient = (await db.execute(patient_query)).scalar_one_or_none()

    # Generate PDF
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'],
        fontSize=20, spaceAfter=20, textColor=colors.HexColor('#1e40af'),
    )
    heading_style = ParagraphStyle(
        'CustomHeading', parent=styles['Heading2'],
        fontSize=14, spaceAfter=10, textColor=colors.HexColor('#1e40af'),
        spaceBefore=15,
    )
    normal_style = styles['Normal']
    disclaimer_style = ParagraphStyle(
        'Disclaimer', parent=styles['Normal'],
        fontSize=8, textColor=colors.gray, spaceBefore=20,
    )

    story = []

    # Title
    story.append(Paragraph("MedBios AI — Clinical Analysis Report", title_style))
    story.append(Spacer(1, 12))

    # Patient info
    if patient:
        patient_data = [
            ["Patient Name", patient.name or "N/A"],
            ["Age", str(patient.age) if patient.age else "N/A"],
            ["Gender", patient.gender or "N/A"],
            ["Report File", report.filename or "N/A"],
            ["Document Type", report.document_type or "N/A"],
            ["Analysis Date", report.created_at.strftime("%Y-%m-%d %H:%M") if report.created_at else "N/A"],
        ]
        t = Table(patient_data, colWidths=[2 * inch, 4 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f9ff')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 16))

    # Summary stats
    abnormal = [lr for lr in lab_results if lr.status != "normal"]
    clinical_report = report.analysis_result or {}
    overall_risk = clinical_report.get("summary", {}).get("overall_risk", 0)

    story.append(Paragraph("Summary", heading_style))
    summary_data = [
        ["Lab Values Extracted", str(len(lab_results))],
        ["Abnormal Values", str(len(abnormal))],
        ["Clinical Insights", str(len(insights))],
        ["Overall Risk Score", f"{overall_risk}%"],
    ]
    t = Table(summary_data, colWidths=[3 * inch, 3 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # Abnormal findings
    if abnormal:
        story.append(Paragraph("Abnormal Findings", heading_style))
        table_data = [["Test", "Value", "Status", "Reference Range"]]
        for lr in abnormal:
            ref_range = f"{lr.reference_min} - {lr.reference_max}" if lr.reference_min else "N/A"
            table_data.append([
                lr.test_name,
                f"{lr.value} {lr.unit or ''}",
                lr.status.upper(),
                ref_range,
            ])
        t = Table(table_data, colWidths=[2 * inch, 1.5 * inch, 1 * inch, 1.5 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        story.append(t)
        story.append(Spacer(1, 16))

    # Clinical insights
    if insights:
        story.append(Paragraph("Clinical Insights", heading_style))
        for i, ins in enumerate(insights, 1):
            conf_color = {"high": "#dc2626", "medium": "#ea580c", "low": "#2563eb"}.get(ins.confidence, "#6b7280")
            story.append(Paragraph(
                f"<b>{i}. {ins.condition}</b> "
                f"<font color='{conf_color}'>[{ins.confidence.upper()}]</font> "
                f"— {ins.category}",
                normal_style,
            ))
            if ins.reasoning:
                story.append(Paragraph(f"<i>{ins.reasoning}</i>", normal_style))
            if ins.recommendation:
                story.append(Paragraph(f"→ {ins.recommendation}", normal_style))
            story.append(Spacer(1, 8))

    # Disclaimer
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by MedBios AI for informational purposes only. "
        "It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified "
        "healthcare provider for clinical decisions. AI-generated insights should be verified by "
        "a licensed physician before any clinical action.",
        disclaimer_style,
    ))

    doc.build(story)
    buffer.seek(0)

    filename = f"medbios_report_{report_id[:8]}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

import asyncio
from pydantic import BaseModel

class ChatMessage(BaseModel):
    message: str

@router.post("/{report_id}/chat")
async def chat_with_report(report_id: str, payload: ChatMessage, db: AsyncSession = Depends(get_db)):
    """Context-aware AI chat that uses actual report data to answer questions."""
    report_result = await db.execute(select(Report).where(Report.id == report_id))
    report = report_result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Fetch actual lab values and insights for this report
    lab_results = (await db.execute(
        select(LabResult).where(LabResult.report_id == report_id)
    )).scalars().all()
    insights = (await db.execute(
        select(ClinicalInsight).where(ClinicalInsight.report_id == report_id)
    )).scalars().all()

    msg = payload.message.lower()
    clinical_report = report.analysis_result or {}

    # Build context from actual data
    abnormal_labs = [lr for lr in lab_results if lr.status != "normal"]
    abnormal_names = {lr.test_name.lower() for lr in abnormal_labs}
    insight_conditions = [ins.condition for ins in insights]
    risk_scores = clinical_report.get("risk_scores", {})

    answer = _build_chat_response(msg, abnormal_labs, insights, risk_scores, insight_conditions)

    return {"answer": answer}


def _build_chat_response(msg, abnormal_labs, insights, risk_scores, conditions):
    """Build a context-aware response using actual report data."""

    # Greetings
    if any(w in msg for w in ("hello", "hi ", "hey", "greetings")):
        abnormal_count = len(abnormal_labs)
        if abnormal_count:
            return (f"Hello! I've analyzed your report and found {abnormal_count} abnormal value(s). "
                    "Feel free to ask about any specific test, condition, or recommendation.")
        return "Hello! Your report looks good overall. Ask me about any specific test or concern."

    # Check if user is asking about a specific lab test
    for lab in abnormal_labs:
        test_lower = lab.test_name.lower()
        if test_lower in msg or test_lower.replace("_", " ") in msg:
            status_desc = {"high": "above", "low": "below", "critical_high": "critically above",
                           "critical_low": "critically below"}.get(lab.status, lab.status)
            ref_range = f"{lab.reference_min}-{lab.reference_max}" if lab.reference_min else "standard range"
            answer = (f"Your {lab.test_name.replace('_', ' ').title()} is {lab.value} {lab.unit or ''}, "
                      f"which is {status_desc} the reference range ({ref_range}).")
            # Attach related insights
            related = [ins for ins in insights
                       if lab.test_name.lower() in (ins.reasoning or "").lower()
                       or lab.test_name.lower() in (ins.condition or "").lower()]
            if related:
                answer += f" This is associated with: {related[0].condition}. {related[0].reasoning}"
            return answer

    # Topic-based responses using actual data
    if any(w in msg for w in ("glucose", "sugar", "diabetes", "hba1c", "a1c")):
        relevant = [ins for ins in insights if "diabet" in (ins.condition or "").lower()
                     or "glucose" in (ins.condition or "").lower()]
        if relevant:
            ins = relevant[0]
            return f"{ins.condition} ({ins.confidence} confidence): {ins.reasoning} Recommendation: {ins.recommendation}"
        return "No glucose-related abnormalities were detected in your report."

    if any(w in msg for w in ("cholesterol", "lipid", "heart", "cardiovascular", "ldl", "hdl")):
        relevant = [ins for ins in insights if ins.category == "Cardiovascular"]
        if relevant:
            parts = [f"- {ins.condition} ({ins.confidence}): {ins.reasoning}" for ins in relevant]
            return "Cardiovascular findings:\n" + "\n".join(parts)
        cv_risk = risk_scores.get("cardiovascular", {})
        if cv_risk:
            return f"Your cardiovascular risk score is {cv_risk.get('score', 'N/A')}% ({cv_risk.get('level', 'N/A')})."
        return "No significant cardiovascular concerns were found in your report."

    if any(w in msg for w in ("kidney", "renal", "creatinine", "egfr")):
        relevant = [ins for ins in insights if ins.category == "Nephrology"
                     or "kidney" in (ins.condition or "").lower()]
        if relevant:
            ins = relevant[0]
            return f"{ins.condition}: {ins.reasoning} Recommendation: {ins.recommendation}"
        return "No kidney-related abnormalities were detected in your report."

    if any(w in msg for w in ("risk", "danger", "score", "overall")):
        overall = risk_scores.get("overall", 0) if isinstance(risk_scores, dict) else 0
        high_systems = [
            f"{sys}: {data.get('score', 0)}% ({data.get('level', 'N/A')})"
            for sys, data in (risk_scores if isinstance(risk_scores, dict) else {}).items()
            if isinstance(data, dict) and data.get("score", 0) >= 40
        ]
        answer = f"Your overall risk score is {overall}%."
        if high_systems:
            answer += " Elevated risk areas: " + "; ".join(high_systems) + "."
        return answer

    if any(w in msg for w in ("abnormal", "problem", "wrong", "issue", "concern")):
        if abnormal_labs:
            items = [f"- {lr.test_name.replace('_', ' ').title()}: {lr.value} ({lr.status})"
                     for lr in abnormal_labs[:8]]
            return "Abnormal findings in your report:\n" + "\n".join(items)
        return "No abnormal values were found in your report."

    if any(w in msg for w in ("diet", "food", "eat", "nutrition", "exercise")):
        nutrition_insights = [ins for ins in insights
                              if ins.category in ("Nutrition", "Endocrinology")]
        if nutrition_insights:
            recs = [ins.recommendation for ins in nutrition_insights if ins.recommendation]
            if recs:
                return "Based on your results, here are relevant recommendations:\n" + "\n".join(f"- {r}" for r in recs)
        return ("Based on your clinical profile, a balanced diet and regular exercise are recommended. "
                "Check the Recommendations tab for personalized guidance.")

    if any(w in msg for w in ("summary", "overview", "explain", "report")):
        summary = clinical_report_summary(conditions, abnormal_labs, risk_scores)
        return summary

    # Fallback with actual context
    if conditions:
        return (f"Your report identified {len(conditions)} clinical finding(s): "
                f"{', '.join(conditions[:3])}. "
                "Ask about any specific condition, lab test, or recommendation for more details.")
    return ("I'm your MedBios AI assistant. Your report has been analyzed. "
            "Ask about specific tests, conditions, risk scores, or recommendations.")


def clinical_report_summary(conditions, abnormal_labs, risk_scores):
    """Generate a text summary from report data."""
    parts = [f"Your report summary: {len(abnormal_labs)} abnormal value(s) detected."]
    if conditions:
        parts.append(f"Clinical findings: {', '.join(conditions[:5])}.")
    if isinstance(risk_scores, dict):
        overall = risk_scores.get("overall", 0)
        if overall:
            parts.append(f"Overall risk score: {overall}%.")
    parts.append("Consult your physician for personalized medical advice.")
    return " ".join(parts)


# ── Health Recommendations ──
from services.recommendations import generate_recommendations

@router.get("/{report_id}/recommendations")
async def get_recommendations(report_id: str, db: AsyncSession = Depends(get_db)):
    """Generate personalized health recommendations based on report lab values."""
    report_result = await db.execute(select(Report).where(Report.id == report_id))
    report = report_result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    lab_result = await db.execute(select(LabResult).where(LabResult.report_id == report_id))
    lab_values = lab_result.scalars().all()

    lab_dicts = [
        {
            "test_name": lr.test_name,
            "value": lr.value,
            "unit": lr.unit,
            "status": lr.status,
            "reference_min": lr.reference_min,
            "reference_max": lr.reference_max,
        }
        for lr in lab_values
    ]

    return generate_recommendations(lab_dicts)
