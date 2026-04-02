"""
MedBios AI — Risk Scoring System
Computes composite risk scores per organ system based on lab values and clinical insights.
"""
import logging

logger = logging.getLogger(__name__)


def compute_risk_scores(
    lab_values: list[dict],
    insights: list[dict],
    patient_info: dict | None = None,
) -> dict:
    """
    Compute composite risk scores per organ system, adjusted for patient demographics.

    Args:
        lab_values: Extracted lab values with status fields.
        insights: Clinical insights from the reasoning engine.
        patient_info: Optional dict with 'age' (int) and 'gender' (str) for risk adjustment.

    Returns: {
        "overall": float (0-100),
        "organ_systems": {
            "cardiovascular": {"score": float, "level": str, "factors": list},
            ...
        }
    }
    """
    organ_systems = {}
    patient_info = patient_info or {}
    age = patient_info.get("age")
    gender = (patient_info.get("gender") or "").lower()

    # Confidence to numeric weight
    conf_weight = {"high": 3.0, "medium": 2.0, "low": 1.0}

    # Status severity weight
    status_weight = {
        "critical_low": 4.0, "critical_high": 4.0,
        "low": 2.0, "high": 2.0,
        "normal": 0.0,
    }

    # Age/gender-based risk multipliers per organ system
    age_risk_multipliers = _get_age_risk_multipliers(age, gender)

    # ── Compute insight-based scores ──
    category_map = {
        "Hematology": "hematological",
        "Cardiovascular": "cardiovascular",
        "Nephrology": "renal",
        "Endocrinology": "metabolic",
        "Hepatology": "hepatic",
        "Electrolytes": "electrolyte",
        "Immunology": "inflammatory",
        "Nutrition": "nutritional",
        "Rheumatology": "inflammatory",
        "Gastroenterology": "gastrointestinal",
        "Pulmonology": "respiratory",
        "Urology": "urological",
    }

    for insight in insights:
        cat = insight.get("category", "General")
        system = category_map.get(cat, cat.lower())

        if system not in organ_systems:
            organ_systems[system] = {"raw_score": 0, "factors": [], "max_possible": 0}

        weight = conf_weight.get(insight.get("confidence", "low"), 1.0)
        organ_systems[system]["raw_score"] += weight
        organ_systems[system]["max_possible"] += 3.0
        organ_systems[system]["factors"].append(insight["condition"])

    # ── Add abnormal lab severity ──
    for lab in lab_values:
        status = lab.get("status", "normal")
        if status == "normal":
            continue
        sw = status_weight.get(status, 0)
        # Map lab tests to organ systems
        canonical = lab.get("canonical_name", "")
        system = _lab_to_system(canonical)
        if system:
            if system not in organ_systems:
                organ_systems[system] = {"raw_score": 0, "factors": [], "max_possible": 0}
            organ_systems[system]["raw_score"] += sw * 0.5
            organ_systems[system]["max_possible"] += 2.0

    # ── Normalize scores to 0-100, apply age/gender adjustments ──
    result = {}
    total_score = 0

    for system, data in organ_systems.items():
        max_p = max(data["max_possible"], 1)
        score = min((data["raw_score"] / max_p) * 100, 100)

        # Apply age/gender risk multiplier
        multiplier = age_risk_multipliers.get(system, 1.0)
        score = min(score * multiplier, 100)

        level = _score_to_level(score)
        result[system] = {
            "score": round(score, 1),
            "level": level,
            "factors": data["factors"],
        }
        total_score += score

    overall = round(total_score / max(len(organ_systems), 1), 1)

    return {
        "overall": overall,
        "overall_level": _score_to_level(overall),
        "organ_systems": result,
    }


def _get_age_risk_multipliers(age: int | None, gender: str) -> dict[str, float]:
    """Return per-organ-system risk multipliers based on patient age and gender."""
    multipliers: dict[str, float] = {}
    if age is None:
        return multipliers

    # Older patients have elevated cardiovascular and renal risk
    if age >= 65:
        multipliers["cardiovascular"] = 1.3
        multipliers["renal"] = 1.25
        multipliers["metabolic"] = 1.15
    elif age >= 50:
        multipliers["cardiovascular"] = 1.15
        multipliers["renal"] = 1.1

    # Gender-specific adjustments
    if gender in ("male", "m"):
        multipliers.setdefault("cardiovascular", 1.0)
        multipliers["cardiovascular"] = min(multipliers["cardiovascular"] * 1.1, 1.5)
        if age and age >= 50:
            multipliers["urological"] = 1.2
    elif gender in ("female", "f"):
        multipliers["hematological"] = multipliers.get("hematological", 1.0) * 1.1  # higher anemia prevalence
        if age and age >= 50:
            multipliers["nutritional"] = 1.15  # bone density / vitamin D

    return multipliers


def _lab_to_system(canonical_name: str) -> str | None:
    """Map a lab test to its organ system."""
    mapping = {
        # Hematological
        "hemoglobin": "hematological", "hematocrit": "hematological",
        "rbc": "hematological", "wbc": "hematological", "platelets": "hematological",
        "mcv": "hematological", "mch": "hematological", "mchc": "hematological",
        "rdw": "hematological", "mpv": "hematological", "reticulocytes": "hematological",
        "neutrophils": "hematological", "lymphocytes": "hematological",
        "monocytes": "hematological", "eosinophils": "hematological", "basophils": "hematological",
        "neutrophils_abs": "hematological", "lymphocytes_abs": "hematological",
        "ferritin": "hematological", "iron": "hematological",
        "tibc": "hematological", "transferrin_saturation": "hematological",
        # Coagulation
        "pt": "hematological", "inr": "hematological", "aptt": "hematological",
        "fibrinogen": "hematological", "d_dimer": "hematological",
        # Cardiovascular
        "ldl": "cardiovascular", "hdl": "cardiovascular",
        "total_cholesterol": "cardiovascular", "triglycerides": "cardiovascular",
        "vldl": "cardiovascular", "non_hdl_cholesterol": "cardiovascular",
        "ldl_hdl_ratio": "cardiovascular", "total_chol_hdl_ratio": "cardiovascular",
        "troponin_i": "cardiovascular", "bnp": "cardiovascular", "nt_probnp": "cardiovascular",
        "ck": "cardiovascular", "ck_mb": "cardiovascular",
        "homocysteine": "cardiovascular", "lp_a": "cardiovascular",
        # Renal
        "creatinine": "renal", "bun": "renal", "egfr": "renal",
        "bun_creatinine_ratio": "renal", "cystatin_c": "renal",
        "uric_acid": "renal", "urine_ph": "renal",
        "urine_specific_gravity": "renal", "urine_protein": "renal", "microalbumin": "renal",
        # Metabolic/Endocrine
        "glucose": "metabolic", "fasting_glucose": "metabolic", "hba1c": "metabolic",
        "insulin": "metabolic",
        "tsh": "metabolic", "t3": "metabolic", "t4": "metabolic",
        "free_t3": "metabolic", "free_t4": "metabolic", "anti_tpo": "metabolic",
        "cortisol_am": "metabolic", "testosterone": "metabolic",
        "estradiol": "metabolic", "pth": "metabolic",
        # Hepatic
        "alt": "hepatic", "ast": "hepatic", "alp": "hepatic", "ggt": "hepatic",
        "bilirubin_total": "hepatic", "bilirubin_direct": "hepatic",
        "albumin": "hepatic", "total_protein": "hepatic",
        "ldh": "hepatic", "globulin": "hepatic", "ag_ratio": "hepatic",
        # Electrolytes
        "sodium": "electrolyte", "potassium": "electrolyte", "calcium": "electrolyte",
        "chloride": "electrolyte", "co2": "electrolyte",
        "magnesium": "electrolyte", "phosphorus": "electrolyte", "ionized_calcium": "electrolyte",
        # Inflammatory
        "crp": "inflammatory", "hs_crp": "inflammatory", "esr": "inflammatory",
        "procalcitonin": "inflammatory", "interleukin_6": "inflammatory",
        # Nutritional
        "vitamin_d": "nutritional", "vitamin_b12": "nutritional", "folate": "nutritional",
        "vitamin_a": "nutritional", "zinc": "nutritional", "selenium": "nutritional",
        # Gastrointestinal
        "amylase": "gastrointestinal", "lipase": "gastrointestinal",
        # Urological
        "psa": "urological",
    }
    return mapping.get(canonical_name)


def _score_to_level(score: float) -> str:
    """Convert numeric score to risk level."""
    if score >= 70:
        return "critical"
    elif score >= 50:
        return "high"
    elif score >= 30:
        return "moderate"
    elif score >= 10:
        return "low"
    return "minimal"
