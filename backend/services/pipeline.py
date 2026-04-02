"""
MedBios AI — Multimodal Pipeline Orchestrator
Orchestrates the full analysis pipeline: OCR → NLP → Abnormal Detection → Reasoning → Knowledge Graph → Report
"""
import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor

from services.ocr_service import extract_text_from_pdf
from services.nlp_service import extract_lab_values, classify_document_type, extract_patient_info
from services.reference_ranges import detect_abnormals
from services.reasoning_engine import run_reasoning, generate_differential_diagnosis
from services.risk_scorer import compute_risk_scores
from services.explainability import build_evidence_chains
from services.report_generator import generate_clinical_summary
from services.knowledge_graph import infer_downstream_risks, get_subgraph

logger = logging.getLogger(__name__)


_executor = ThreadPoolExecutor(max_workers=2)


async def run_full_pipeline_async(file_bytes: bytes, filename: str = "report.pdf") -> dict:
    """Async wrapper that runs the CPU-bound pipeline in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, run_full_pipeline, file_bytes, filename)


def run_full_pipeline(file_bytes: bytes, filename: str = "report.pdf") -> dict:
    """
    Run the complete MedBios analysis pipeline on a medical document.

    Pipeline stages:
    1. OCR — extract text from PDF
    2. NLP — extract lab values and classify document
    3. Abnormal Detection — compare against reference ranges
    4. Clinical Reasoning — generate insights
    5. Risk Scoring — compute organ system risk scores
    6. Knowledge Graph — infer downstream risks
    7. Explainability — build evidence chains
    8. Report Generation — produce clinical summary

    Returns: Complete analysis result dict
    """
    start_time = time.time()
    pipeline_log = []

    def log_stage(stage: str, detail: str = ""):
        elapsed = round(time.time() - start_time, 3)
        entry = {"stage": stage, "elapsed_s": elapsed, "detail": detail}
        pipeline_log.append(entry)
        logger.info(f"[Pipeline] {stage}: {detail} ({elapsed}s)")

    # ── Stage 1: OCR ──
    log_stage("OCR", "Extracting text from document")
    raw_text = extract_text_from_pdf(file_bytes)
    log_stage("OCR", f"Extracted {len(raw_text)} characters")

    if not raw_text or len(raw_text.strip()) < 10:
        return {
            "status": "error",
            "error": "Could not extract text from document. Please upload a clearer PDF.",
            "raw_text": raw_text,
            "pipeline_log": pipeline_log,
        }

    # ── Stage 2: NLP ──
    log_stage("NLP", "Extracting lab values and classifying document")
    lab_values = extract_lab_values(raw_text)
    document_type = classify_document_type(raw_text)
    patient_info = extract_patient_info(raw_text)
    log_stage("NLP", f"Extracted {len(lab_values)} lab values, type: {document_type}")

    # ── Stage 3: Abnormal Detection ──
    log_stage("Abnormal Detection", "Comparing against reference ranges")
    lab_values = detect_abnormals(lab_values)
    abnormal_count = sum(1 for lv in lab_values if lv.get("status", "normal") != "normal")
    log_stage("Abnormal Detection", f"Found {abnormal_count} abnormal values")

    # ── Stage 4: Clinical Reasoning ──
    log_stage("Clinical Reasoning", "Running inference rules")
    insights = run_reasoning(lab_values)
    differential = generate_differential_diagnosis(insights)
    log_stage("Clinical Reasoning", f"Generated {len(insights)} insights")

    # ── Stage 5: Risk Scoring ──
    log_stage("Risk Scoring", "Computing organ system risk scores")
    risk_scores = compute_risk_scores(lab_values, insights, patient_info=patient_info)
    log_stage("Risk Scoring", f"Overall risk: {risk_scores.get('overall', 0)}% ({risk_scores.get('overall_level', 'minimal')})")

    # ── Stage 6: Knowledge Graph ──
    log_stage("Knowledge Graph", "Inferring downstream risks")
    abnormal_labs = [lv for lv in lab_values if lv.get("status", "normal") != "normal"]
    graph_risks = infer_downstream_risks(abnormal_labs)

    # Get subgraph for visualization
    graph_entities = [lv.get("canonical_name", "") for lv in abnormal_labs]
    subgraph = get_subgraph(graph_entities, depth=2)
    log_stage("Knowledge Graph", f"Found {len(graph_risks)} downstream risks, subgraph: {len(subgraph['nodes'])} nodes")

    # ── Stage 7: Explainability ──
    log_stage("Explainability", "Building evidence chains")
    evidence_chains = build_evidence_chains(insights, lab_values, raw_text)
    log_stage("Explainability", f"Built {len(evidence_chains)} evidence chains")

    # ── Stage 8: Report Generation ──
    log_stage("Report Generation", "Generating clinical summary")
    analysis = {
        "lab_values": lab_values,
        "insights": insights,
        "risk_scores": risk_scores,
        "patient_info": patient_info,
        "document_type": document_type,
        "differential_diagnosis": differential,
    }
    clinical_report = generate_clinical_summary(analysis)
    log_stage("Report Generation", "Complete")

    total_time = round(time.time() - start_time, 3)

    # ── Final Result ──
    return {
        "status": "completed",
        "filename": filename,
        "processing_time_s": total_time,
        "raw_text": raw_text,
        "document_type": document_type,
        "patient_info": patient_info,
        "lab_values": lab_values,
        "abnormal_count": abnormal_count,
        "insights": insights,
        "differential_diagnosis": differential,
        "risk_scores": risk_scores,
        "graph_risks": graph_risks,
        "knowledge_graph": subgraph,
        "evidence_chains": evidence_chains,
        "clinical_report": clinical_report,
        "pipeline_log": pipeline_log,
    }
