"""
MedBios AI — Backend Unit Tests
Tests for core pipeline services.
"""
import pytest
import json
from pathlib import Path

# ── Import services ──
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.reference_ranges import normalize_test_name, detect_abnormals, REFERENCE_RANGES
from services.nlp_service import extract_lab_values, classify_document_type, extract_patient_info
from services.reasoning_engine import run_reasoning
from services.risk_scorer import compute_risk_scores
from services.explainability import build_evidence_chains
from services.report_generator import generate_clinical_summary
from services.knowledge_graph import query_related, infer_downstream_risks, get_subgraph
from services.trend_analysis import analyze_trends, _compute_direction
from services.drug_interactions import (
    detect_drug_interactions, detect_drug_lab_interactions,
    normalize_drug_name, run_full_interaction_check,
)


# ═══════════════════════════════════════════════════════════════
# Reference Ranges Tests
# ═══════════════════════════════════════════════════════════════

class TestReferenceRanges:
    def test_normalize_known_alias(self):
        assert normalize_test_name("hb") == "hemoglobin"
        assert normalize_test_name("HB") == "hemoglobin"
        assert normalize_test_name("Hgb") == "hemoglobin"

    def test_normalize_direct_name(self):
        assert normalize_test_name("hemoglobin") == "hemoglobin"
        assert normalize_test_name("glucose") == "glucose"

    def test_reference_range_exists(self):
        assert "hemoglobin" in REFERENCE_RANGES
        ref = REFERENCE_RANGES["hemoglobin"]
        assert ref["min"] < ref["max"]

    def test_unknown_test(self):
        assert "nonexistent_test_xyz" not in REFERENCE_RANGES

    def test_detect_normal(self):
        results = detect_abnormals([{"test_name": "hemoglobin", "value": 14.0}])
        assert len(results) == 1
        assert results[0]["status"] == "normal"

    def test_detect_low(self):
        results = detect_abnormals([{"test_name": "hemoglobin", "value": 10.0}])
        assert results[0]["status"] == "low"

    def test_detect_high(self):
        results = detect_abnormals([{"test_name": "glucose", "value": 180.0}])
        assert results[0]["status"] == "high"

    def test_detect_critical_low(self):
        results = detect_abnormals([{"test_name": "hemoglobin", "value": 5.0}])
        assert results[0]["status"] in ("critical_low", "low")


# ═══════════════════════════════════════════════════════════════
# NLP Service Tests
# ═══════════════════════════════════════════════════════════════

class TestNLPService:
    SAMPLE_TEXT = """
    COMPLETE BLOOD COUNT
    Hemoglobin    8.9 g/dL       13.0 - 17.0
    WBC Count     12.8 K/uL      4.0 - 11.0
    Platelet Count 135 K/uL      150 - 400
    Glucose       142 mg/dL      70 - 100
    Creatinine    1.8 mg/dL      0.6 - 1.2
    HbA1c         7.2 %          4.0 - 5.6
    """

    def test_extract_lab_values(self):
        values = extract_lab_values(self.SAMPLE_TEXT)
        assert len(values) > 0
        test_names = [v.get("canonical_name", v.get("test_name", "")).lower() for v in values]
        assert any("hemoglobin" in t or "hb" in t for t in test_names)

    def test_classify_document_lab(self):
        doc_type = classify_document_type(self.SAMPLE_TEXT)
        assert doc_type == "lab_report"

    def test_classify_document_radiology(self):
        rad_text = "RADIOLOGY REPORT\nChest X-ray\nImpressions: No acute findings."
        doc_type = classify_document_type(rad_text)
        assert doc_type == "radiology_report"

    def test_extract_patient_info(self):
        text = "Patient Name: John Doe\nAge: 45 years\nGender: Male"
        info = extract_patient_info(text)
        assert info.get("name") is not None or info.get("age") is not None


# ═══════════════════════════════════════════════════════════════
# Reasoning Engine Tests
# ═══════════════════════════════════════════════════════════════

class TestReasoningEngine:
    def test_iron_deficiency_anemia(self):
        lab_values = [
            {"canonical_name": "hemoglobin", "value": 8.9, "status": "low"},
            {"canonical_name": "ferritin", "value": 8.5, "status": "low"},
            {"canonical_name": "mcv", "value": 72.5, "status": "low"},
        ]
        insights = run_reasoning(lab_values)
        conditions = [i["condition"].lower() for i in insights]
        assert any("anemia" in c or "iron" in c for c in conditions)

    def test_diabetes_detection(self):
        lab_values = [
            {"canonical_name": "hba1c", "value": 7.2, "status": "high"},
            {"canonical_name": "glucose", "value": 142, "status": "high"},
        ]
        insights = run_reasoning(lab_values)
        conditions = [i["condition"].lower() for i in insights]
        assert any("diabetes" in c for c in conditions)

    def test_kidney_disease(self):
        lab_values = [
            {"canonical_name": "creatinine", "value": 1.8, "status": "high"},
            {"canonical_name": "egfr", "value": 42, "status": "low"},
            {"canonical_name": "bun", "value": 28, "status": "high"},
        ]
        insights = run_reasoning(lab_values)
        conditions = [i["condition"].lower() for i in insights]
        assert any("kidney" in c or "ckd" in c or "renal" in c for c in conditions)

    def test_cardiovascular_risk(self):
        lab_values = [
            {"canonical_name": "ldl", "value": 172, "status": "high"},
            {"canonical_name": "hdl", "value": 34, "status": "low"},
            {"canonical_name": "triglycerides", "value": 280, "status": "high"},
        ]
        insights = run_reasoning(lab_values)
        conditions = [i["condition"].lower() for i in insights]
        assert any("ldl" in c or "cholesterol" in c or "cardiovascular" in c for c in conditions)

    def test_no_insights_for_normal(self):
        lab_values = [
            {"canonical_name": "hemoglobin", "value": 14.5, "status": "normal"},
            {"canonical_name": "glucose", "value": 90, "status": "normal"},
        ]
        insights = run_reasoning(lab_values)
        assert len(insights) == 0

    def test_confidence_levels(self):
        lab_values = [
            {"canonical_name": "hba1c", "value": 7.2, "status": "high"},
        ]
        insights = run_reasoning(lab_values)
        assert all(i["confidence"] in ("high", "medium", "low") for i in insights)


# ═══════════════════════════════════════════════════════════════
# Risk Scorer Tests
# ═══════════════════════════════════════════════════════════════

class TestRiskScorer:
    def test_risk_scores_structure(self):
        insights = [
            {"condition": "Test", "category": "Cardiovascular", "confidence": "high",
             "evidence": [], "reasoning": "test", "recommendation": "test"},
        ]
        lab_values = [
            {"canonical_name": "ldl", "value": 172, "status": "high"},
        ]
        scores = compute_risk_scores(lab_values, insights)
        assert "overall" in scores
        assert isinstance(scores["overall"], (int, float))

    def test_zero_risk_for_normal(self):
        scores = compute_risk_scores([], [])
        assert scores["overall"] == 0



# ═══════════════════════════════════════════════════════════════
# Knowledge Graph Tests
# ═══════════════════════════════════════════════════════════════

class TestKnowledgeGraph:
    def test_graph_has_nodes(self):
        # The graph loads seed data on import, so query_related should work
        related = query_related("hemoglobin")
        assert len(related) > 0

    def test_query_related(self):
        related = query_related("hemoglobin")
        assert len(related) > 0

    def test_infer_downstream_risks(self):
        lab_values = [
            {"canonical_name": "hemoglobin", "value": 8.0, "status": "low"},
        ]
        risks = infer_downstream_risks(lab_values)
        assert isinstance(risks, list)

    def test_subgraph_extraction(self):
        subgraph = get_subgraph(["hemoglobin", "glucose"], depth=1)
        assert "nodes" in subgraph
        assert "edges" in subgraph
        assert len(subgraph["nodes"]) > 0


# ═══════════════════════════════════════════════════════════════
# Trend Analysis Tests
# ═══════════════════════════════════════════════════════════════

class TestTrendAnalysis:
    def test_insufficient_data(self):
        result = analyze_trends([{"lab_values": []}])
        assert result["status"] == "insufficient_data"

    def test_increasing_trend(self):
        history = [
            {"report_date": "2026-01-01T00:00:00", "lab_values": [
                {"test_name": "glucose", "value": 100, "status": "normal"},
            ]},
            {"report_date": "2026-02-01T00:00:00", "lab_values": [
                {"test_name": "glucose", "value": 130, "status": "high"},
            ]},
            {"report_date": "2026-03-01T00:00:00", "lab_values": [
                {"test_name": "glucose", "value": 160, "status": "high"},
            ]},
        ]
        result = analyze_trends(history)
        assert result["status"] == "analyzed"
        assert "glucose" in result["trends"]
        glucose_trend = result["trends"]["glucose"]
        assert glucose_trend["direction"] == "increasing"
        assert glucose_trend["alert"] is True

    def test_stable_trend(self):
        history = [
            {"report_date": "2026-01-01T00:00:00", "lab_values": [
                {"test_name": "sodium", "value": 140, "status": "normal"},
            ]},
            {"report_date": "2026-03-01T00:00:00", "lab_values": [
                {"test_name": "sodium", "value": 141, "status": "normal"},
            ]},
        ]
        result = analyze_trends(history)
        if "sodium" in result["trends"]:
            assert result["trends"]["sodium"]["direction"] == "stable"

    def test_direction_computation(self):
        assert _compute_direction([10, 12, 14, 16]) == "increasing"
        assert _compute_direction([16, 14, 12, 10]) == "decreasing"
        assert _compute_direction([10, 10, 10, 10]) == "stable"


# ═══════════════════════════════════════════════════════════════
# Drug Interaction Tests
# ═══════════════════════════════════════════════════════════════

class TestDrugInteractions:
    def test_normalize_drug_name(self):
        assert normalize_drug_name("Lisinopril") == "ace inhibitor"
        assert normalize_drug_name("atorvastatin") == "statin"
        assert normalize_drug_name("Ibuprofen") == "nsaid"
        assert normalize_drug_name("unknown_drug") == "unknown_drug"

    def test_warfarin_aspirin_interaction(self):
        result = detect_drug_interactions(["warfarin", "aspirin"])
        assert result["total"] == 1
        assert result["interactions"][0]["severity"] == "high"
        assert "bleeding" in result["interactions"][0]["effect"].lower()

    def test_ssri_maoi_critical(self):
        result = detect_drug_interactions(["fluoxetine", "phenelzine"])
        assert result["total"] == 1
        assert result["interactions"][0]["severity"] == "critical"

    def test_no_interactions(self):
        result = detect_drug_interactions(["aspirin", "metformin"])
        assert result["total"] == 0

    def test_single_drug(self):
        result = detect_drug_interactions(["aspirin"])
        assert result["total"] == 0

    def test_drug_lab_interaction(self):
        medications = ["metformin"]
        lab_values = [
            {"test_name": "glucose", "value": 95, "status": "normal"},
            {"test_name": "vitamin b12", "value": 180, "status": "low"},
        ]
        findings = detect_drug_lab_interactions(medications, lab_values)
        assert len(findings) > 0

    def test_full_interaction_check(self):
        result = run_full_interaction_check(
            medications=["warfarin", "aspirin", "metformin"],
            lab_values=[{"test_name": "glucose", "value": 90, "status": "normal"}],
        )
        assert result["alert_level"] in ("critical", "high", "moderate", "low", "none")
        assert result["drug_drug_interactions"]["total"] >= 1

    def test_ace_inhibitor_potassium(self):
        result = detect_drug_interactions(["lisinopril", "potassium supplement"])
        assert result["total"] == 1
        assert "hyperkalemia" in result["interactions"][0]["effect"].lower()

    # ── V13 Expansion Tests ──

    def test_sildenafil_nitrate_critical(self):
        """PDE5 inhibitor + nitrate = CRITICAL contraindication"""
        result = detect_drug_interactions(["sildenafil", "nitroglycerin"])
        assert result["total"] == 1
        assert result["interactions"][0]["severity"] == "critical"
        assert "hypotension" in result["interactions"][0]["effect"].lower()

    def test_macrolide_statin_via_alias(self):
        """Clarithromycin (macrolide) + atorvastatin (statin) = rhabdomyolysis risk"""
        result = detect_drug_interactions(["clarithromycin", "atorvastatin"])
        assert result["total"] == 1
        assert result["interactions"][0]["severity"] == "high"

    def test_tramadol_ssri_serotonin(self):
        """Tramadol + SSRI = serotonin syndrome risk"""
        result = detect_drug_interactions(["tramadol", "sertraline"])
        assert result["total"] == 1
        assert "serotonin" in result["interactions"][0]["effect"].lower()

    def test_metronidazole_alcohol(self):
        """Metronidazole + alcohol = disulfiram-like reaction"""
        result = detect_drug_interactions(["metronidazole", "alcohol"])
        assert result["total"] == 1
        assert "disulfiram" in result["interactions"][0]["effect"].lower()

    def test_new_alias_loop_diuretic(self):
        """Furosemide should map to loop diuretic"""
        assert normalize_drug_name("furosemide") == "loop diuretic"

    def test_new_alias_potassium_sparing(self):
        """Spironolactone should map to potassium sparing diuretic"""
        assert normalize_drug_name("spironolactone") == "potassium sparing diuretic"

    def test_multi_drug_interactions(self):
        """Multiple drugs can trigger multiple interactions"""
        result = detect_drug_interactions([
            "warfarin", "aspirin", "fluoxetine", "tramadol", "ibuprofen"
        ])
        # warfarin+aspirin, warfarin+ibuprofen, ssri+nsaid, tramadol+ssri
        assert result["total"] >= 3
        severities = [i["severity"] for i in result["interactions"]]
        assert "high" in severities


# ═══════════════════════════════════════════════════════════════
# Explainability Tests
# ═══════════════════════════════════════════════════════════════

class TestExplainability:
    def test_build_evidence_chains(self):
        insights = [
            {
                "condition": "Anemia",
                "confidence": "high",
                "category": "Hematology",
                "evidence": [{"test": "hemoglobin", "value": 8.9, "finding": "below normal"}],
                "reasoning": "Low hemoglobin with microcytosis",
            },
        ]
        lab_values = [
            {"canonical_name": "hemoglobin", "value": 8.9, "status": "low"},
        ]
        chains = build_evidence_chains(insights, lab_values, "Hemoglobin 8.9 g/dL")
        assert isinstance(chains, list)
        assert len(chains) > 0


# ═══════════════════════════════════════════════════════════════
# Risk Scorer — Patient Context Tests
# ═══════════════════════════════════════════════════════════════

class TestRiskScorerPatientContext:
    """Test that patient demographics affect risk scoring."""

    def _base_inputs(self):
        insights = [
            {"condition": "High LDL", "category": "Cardiovascular", "confidence": "high",
             "evidence": [], "reasoning": "test", "recommendation": "test"},
        ]
        lab_values = [
            {"canonical_name": "ldl", "value": 172, "status": "high"},
        ]
        return lab_values, insights

    def test_elderly_male_higher_cardiovascular_risk(self):
        lab_values, insights = self._base_inputs()
        scores_no_ctx = compute_risk_scores(lab_values, insights)
        scores_elderly = compute_risk_scores(lab_values, insights, patient_info={"age": 70, "gender": "male"})
        assert scores_elderly["organ_systems"]["cardiovascular"]["score"] > scores_no_ctx["organ_systems"]["cardiovascular"]["score"]

    def test_young_patient_no_boost(self):
        lab_values, insights = self._base_inputs()
        scores_base = compute_risk_scores(lab_values, insights)
        scores_young = compute_risk_scores(lab_values, insights, patient_info={"age": 25, "gender": "male"})
        # Young male gets 1.1x cardiovascular from gender but no age boost
        assert scores_young["organ_systems"]["cardiovascular"]["score"] >= scores_base["organ_systems"]["cardiovascular"]["score"]

    def test_no_patient_info_same_as_none(self):
        lab_values, insights = self._base_inputs()
        scores_none = compute_risk_scores(lab_values, insights, patient_info=None)
        scores_empty = compute_risk_scores(lab_values, insights, patient_info={})
        assert scores_none == scores_empty


# ═══════════════════════════════════════════════════════════════
# Dynamic JSON Rule Engine Tests
# ═══════════════════════════════════════════════════════════════

from services.reasoning_engine import _evaluate_json_rule, _compare

class TestDynamicRules:
    def test_compare_operators(self):
        assert _compare(10, ">", 5) is True
        assert _compare(10, "<", 5) is False
        assert _compare(10, ">=", 10) is True
        assert _compare(10, "<=", 10) is True
        assert _compare(10, "==", 10) is True
        assert _compare(10, "!=", 10) is False

    def test_json_rule_matches(self):
        rule = {
            "name": "Test Rule",
            "conditions": [{"test": "tsh", "operator": ">", "value": 4.5}],
            "optional_conditions": [],
            "condition_label": "High TSH",
            "category": "Endocrinology",
            "base_confidence": "medium",
            "reasoning": "Elevated TSH",
            "recommendation": "Check thyroid",
        }
        labs = {"tsh": {"canonical_name": "tsh", "value": 6.0, "status": "high"}}
        result = _evaluate_json_rule(rule, labs)
        assert result is not None
        assert result["condition"] == "High TSH"
        assert result["confidence"] == "medium"

    def test_json_rule_no_match(self):
        rule = {
            "name": "Test Rule",
            "conditions": [{"test": "tsh", "operator": ">", "value": 4.5}],
            "optional_conditions": [],
            "condition_label": "High TSH",
            "category": "Endocrinology",
            "base_confidence": "medium",
            "reasoning": "Elevated TSH",
            "recommendation": "Check thyroid",
        }
        labs = {"tsh": {"canonical_name": "tsh", "value": 2.0, "status": "normal"}}
        result = _evaluate_json_rule(rule, labs)
        assert result is None

    def test_json_rule_optional_upgrades_confidence(self):
        rule = {
            "name": "Test Rule",
            "conditions": [{"test": "tsh", "operator": ">", "value": 4.5}],
            "optional_conditions": [{"test": "free_t4", "operator": "<", "value": 0.8}],
            "condition_label": "Hypothyroidism",
            "category": "Endocrinology",
            "base_confidence": "medium",
            "upgraded_confidence": "high",
            "reasoning": "Elevated TSH with low T4",
            "recommendation": "Full thyroid panel",
        }
        labs = {
            "tsh": {"canonical_name": "tsh", "value": 6.0, "status": "high"},
            "free_t4": {"canonical_name": "free_t4", "value": 0.5, "status": "low"},
        }
        result = _evaluate_json_rule(rule, labs)
        assert result is not None
        assert result["confidence"] == "high"

    def test_json_rule_missing_required_test(self):
        rule = {
            "name": "Test Rule",
            "conditions": [{"test": "tsh", "operator": ">", "value": 4.5}],
            "optional_conditions": [],
            "condition_label": "High TSH",
            "category": "Endocrinology",
            "base_confidence": "medium",
            "reasoning": "test",
            "recommendation": "test",
        }
        labs = {"glucose": {"canonical_name": "glucose", "value": 90, "status": "normal"}}
        result = _evaluate_json_rule(rule, labs)
        assert result is None


# ═══════════════════════════════════════════════════════════════
# Pipeline Integration Tests
# ═══════════════════════════════════════════════════════════════

class TestPipelineIntegration:
    """Integration tests that run multiple services together."""

    def test_full_reasoning_to_risk_pipeline(self):
        """Test that reasoning output feeds correctly into risk scoring."""
        lab_values = [
            {"canonical_name": "hemoglobin", "value": 8.9, "status": "low"},
            {"canonical_name": "ferritin", "value": 8.5, "status": "low"},
            {"canonical_name": "mcv", "value": 72.5, "status": "low"},
            {"canonical_name": "ldl", "value": 185, "status": "high"},
            {"canonical_name": "hdl", "value": 32, "status": "low"},
            {"canonical_name": "creatinine", "value": 2.1, "status": "high"},
            {"canonical_name": "egfr", "value": 35, "status": "low"},
        ]
        # Run reasoning
        insights = run_reasoning(lab_values)
        assert len(insights) > 0

        # Feed into risk scorer with patient context
        scores = compute_risk_scores(lab_values, insights, patient_info={"age": 65, "gender": "male"})
        assert scores["overall"] > 0
        assert "hematological" in scores["organ_systems"]
        assert "cardiovascular" in scores["organ_systems"]
        assert "renal" in scores["organ_systems"]

        # Verify risk levels are sensible
        hema_score = scores["organ_systems"]["hematological"]["score"]
        assert hema_score > 30, "Multiple hematological abnormalities should produce significant risk"

    def test_nlp_to_reasoning_pipeline(self):
        """Test NLP extraction feeds into reasoning correctly."""
        text = """
        COMPLETE BLOOD COUNT
        Hemoglobin    8.5 g/dL       13.0 - 17.0
        Ferritin      12 ng/mL       20 - 250
        MCV           74 fL          80 - 100
        Glucose       210 mg/dL      70 - 100
        HbA1c         8.1 %          4.0 - 5.6
        """
        from services.nlp_service import extract_lab_values
        from services.reference_ranges import detect_abnormals

        lab_values = extract_lab_values(text)
        assert len(lab_values) >= 3

        lab_values = detect_abnormals(lab_values)
        abnormal = [lv for lv in lab_values if lv.get("status") != "normal"]
        assert len(abnormal) >= 1

        insights = run_reasoning(lab_values)
        conditions = [i["condition"].lower() for i in insights]
        # Should detect at least one clinical condition
        assert len(insights) >= 1

    def test_evidence_chain_integration(self):
        """Test that evidence chains build from reasoning output."""
        lab_values = [
            {"canonical_name": "hemoglobin", "value": 8.9, "status": "low"},
            {"canonical_name": "ferritin", "value": 8.5, "status": "low"},
        ]
        insights = run_reasoning(lab_values)
        assert len(insights) > 0

        chains = build_evidence_chains(insights, lab_values, "Hemoglobin 8.9 Ferritin 8.5")
        assert len(chains) > 0

    def test_report_generation_integration(self):
        """Test full report generation from lab values."""
        lab_values = [
            {"canonical_name": "glucose", "value": 180, "status": "high"},
            {"canonical_name": "hba1c", "value": 7.5, "status": "high"},
        ]
        from services.reference_ranges import detect_abnormals
        lab_values = detect_abnormals(lab_values)
        insights = run_reasoning(lab_values)
        risk_scores = compute_risk_scores(lab_values, insights)

        analysis = {
            "lab_values": lab_values,
            "insights": insights,
            "risk_scores": risk_scores,
            "patient_info": {"name": "Test Patient", "age": 55, "gender": "Male"},
            "document_type": "lab_report",
            "differential_diagnosis": [],
        }
        report = generate_clinical_summary(analysis)
        assert isinstance(report, dict)
        assert "summary" in report or "abnormal_findings" in report


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
