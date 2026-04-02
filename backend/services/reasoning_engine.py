"""
MedBios AI — Clinical Reasoning Engine
Rule-based inference engine for clinical interpretation of lab values.
Generates clinical insights with probabilistic confidence scoring.
Supports both hardcoded Python rules and dynamic JSON-based rules.
"""
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Path for external JSON rules
_CUSTOM_RULES_PATH = Path(__file__).parent.parent / "data" / "custom_rules.json"
_custom_rules_cache: list[dict] | None = None


def _load_custom_rules() -> list[dict]:
    """Load custom rules from JSON file. Cached after first load."""
    global _custom_rules_cache
    if _custom_rules_cache is not None:
        return _custom_rules_cache
    if _CUSTOM_RULES_PATH.exists():
        try:
            with open(_CUSTOM_RULES_PATH) as f:
                _custom_rules_cache = json.load(f)
                logger.info(f"Loaded {len(_custom_rules_cache)} custom rules from {_CUSTOM_RULES_PATH}")
                return _custom_rules_cache
        except Exception as e:
            logger.error(f"Failed to load custom rules: {e}")
    _custom_rules_cache = []
    return _custom_rules_cache


def reload_custom_rules():
    """Force reload of custom rules from disk (useful after editing the JSON file)."""
    global _custom_rules_cache
    _custom_rules_cache = None
    return _load_custom_rules()


def _evaluate_json_rule(rule: dict, labs: dict) -> Optional[dict]:
    """
    Evaluate a single JSON-defined rule against the lab lookup.

    JSON rule format:
    {
        "name": "Hypothyroidism Screening",
        "conditions": [
            {"test": "tsh", "operator": ">", "value": 4.5}
        ],
        "optional_conditions": [
            {"test": "free_t4", "operator": "<", "value": 0.8}
        ],
        "condition_label": "Possible Hypothyroidism",
        "category": "Endocrinology",
        "base_confidence": "medium",
        "upgraded_confidence": "high",
        "reasoning": "Elevated TSH suggests underactive thyroid.",
        "recommendation": "Full thyroid panel including Free T4, Free T3, anti-TPO antibodies"
    }
    """
    conditions = rule.get("conditions", [])
    if not conditions:
        return None

    evidence = []
    all_required_met = True

    for cond in conditions:
        test_name = cond["test"].lower()
        val = _get_val(labs, test_name)
        if val is None:
            all_required_met = False
            break
        if not _compare(val, cond["operator"], cond["value"]):
            all_required_met = False
            break
        evidence.append({
            "test": test_name.replace("_", " ").title(),
            "value": val,
            "finding": f"{cond['operator']} {cond['value']}",
        })

    if not all_required_met:
        return None

    confidence = rule.get("base_confidence", "low")

    # Check optional conditions for confidence upgrade
    for opt in rule.get("optional_conditions", []):
        test_name = opt["test"].lower()
        val = _get_val(labs, test_name)
        if val is not None and _compare(val, opt["operator"], opt["value"]):
            evidence.append({
                "test": test_name.replace("_", " ").title(),
                "value": val,
                "finding": f"{opt['operator']} {opt['value']}",
            })
            confidence = rule.get("upgraded_confidence", confidence)

    return {
        "condition": rule["condition_label"],
        "confidence": confidence,
        "category": rule.get("category", "General"),
        "evidence": evidence,
        "reasoning": rule.get("reasoning", ""),
        "recommendation": rule.get("recommendation", ""),
    }


def _compare(val: float, operator: str, threshold: float) -> bool:
    """Evaluate a comparison operator."""
    ops = {">": val > threshold, "<": val < threshold,
           ">=": val >= threshold, "<=": val <= threshold,
           "==": val == threshold, "!=": val != threshold}
    return ops.get(operator, False)


# ── Clinical Rules ─────────────────────────────────────────────────────────

def run_reasoning(lab_values: list[dict]) -> list[dict]:
    """
    Run all clinical reasoning rules against extracted lab values.

    Input:  lab_values with 'canonical_name', 'value', 'status' fields
    Output: List of clinical insights with condition, confidence, evidence, etc.
    """
    # Build lookup dict: canonical_name → lab entry
    labs = {}
    for lab in lab_values:
        name = lab.get("canonical_name", lab.get("test_name", "")).lower()
        labs[name] = lab

    insights = []

    # Run hardcoded Python rules
    for rule_fn in ALL_RULES:
        try:
            result = rule_fn(labs)
            if result:
                if isinstance(result, list):
                    insights.extend(result)
                else:
                    insights.append(result)
        except Exception as e:
            logger.error(f"Rule {rule_fn.__name__} failed: {e}")

    # Run dynamic JSON rules
    for rule in _load_custom_rules():
        try:
            result = _evaluate_json_rule(rule, labs)
            if result:
                insights.append(result)
        except Exception as e:
            logger.error(f"Custom rule '{rule.get('name', 'unknown')}' failed: {e}")

    # Sort by confidence priority
    confidence_order = {"high": 0, "medium": 1, "low": 2}
    insights.sort(key=lambda x: confidence_order.get(x.get("confidence", "low"), 3))

    return insights


def _get_val(labs: dict, name: str) -> Optional[float]:
    """Safely get a lab value."""
    entry = labs.get(name)
    return entry["value"] if entry and entry.get("value") is not None else None


def _get_status(labs: dict, name: str) -> Optional[str]:
    """Safely get a lab status."""
    entry = labs.get(name)
    return entry.get("status") if entry else None


# ── HEMATOLOGY RULES ────────────────────────────────────────────────────────

def rule_iron_deficiency_anemia(labs: dict) -> Optional[dict]:
    """Detect iron deficiency anemia."""
    hb = _get_val(labs, "hemoglobin")
    ferritin = _get_val(labs, "ferritin")
    mcv = _get_val(labs, "mcv")

    if hb is not None and hb < 12:
        evidence = [{"test": "Hemoglobin", "value": hb, "finding": "Below normal (<12 g/dL)"}]
        
        if ferritin is not None and ferritin < 30:
            evidence.append({"test": "Ferritin", "value": ferritin, "finding": "Low (<30 ng/mL)"})
            confidence = "high"
            reasoning = (
                "Low hemoglobin combined with low ferritin strongly suggests "
                "iron deficiency as the cause of anemia. Ferritin is the most "
                "specific marker for iron stores."
            )
        elif mcv is not None and mcv < 80:
            evidence.append({"test": "MCV", "value": mcv, "finding": "Microcytic (<80 fL)"})
            confidence = "medium"
            reasoning = (
                "Low hemoglobin with microcytosis (low MCV) suggests iron deficiency "
                "or thalassemia trait. Iron studies recommended for confirmation."
            )
        else:
            confidence = "medium"
            reasoning = (
                "Hemoglobin is below normal range. Further workup with iron studies "
                "and reticulocyte count recommended to determine etiology."
            )

        return {
            "condition": "Iron Deficiency Anemia",
            "confidence": confidence,
            "category": "Hematology",
            "evidence": evidence,
            "reasoning": reasoning,
            "recommendation": "Iron panel (serum iron, TIBC, ferritin), reticulocyte count, peripheral smear",
        }
    return None


def rule_b12_folate_anemia(labs: dict) -> Optional[dict]:
    """Detect B12/folate deficiency anemia (macrocytic)."""
    hb = _get_val(labs, "hemoglobin")
    mcv = _get_val(labs, "mcv")
    b12 = _get_val(labs, "vitamin_b12")
    folate = _get_val(labs, "folate")

    if hb is not None and hb < 12 and mcv is not None and mcv > 100:
        evidence = [
            {"test": "Hemoglobin", "value": hb, "finding": "Below normal"},
            {"test": "MCV", "value": mcv, "finding": "Macrocytic (>100 fL)"},
        ]
        confidence = "medium"
        reasoning = "Macrocytic anemia (low Hb + high MCV) suggests B12 or folate deficiency."

        if b12 is not None and b12 < 200:
            evidence.append({"test": "Vitamin B12", "value": b12, "finding": "Low (<200 pg/mL)"})
            confidence = "high"
            reasoning = "Macrocytic anemia with confirmed low B12 level."

        if folate is not None and folate < 2.7:
            evidence.append({"test": "Folate", "value": folate, "finding": "Low (<2.7 ng/mL)"})
            confidence = "high"
            reasoning += " Folate deficiency also detected."

        return {
            "condition": "Macrocytic Anemia (B12/Folate Deficiency)",
            "confidence": confidence,
            "category": "Hematology",
            "evidence": evidence,
            "reasoning": reasoning,
            "recommendation": "Vitamin B12 level, folate level, methylmalonic acid, homocysteine",
        }
    return None


def rule_anemia_of_chronic_disease(labs: dict) -> Optional[dict]:
    """Detect anemia of chronic disease pattern."""
    hb = _get_val(labs, "hemoglobin")
    ferritin = _get_val(labs, "ferritin")
    iron = _get_val(labs, "iron")
    crp = _get_val(labs, "crp")

    if hb is not None and hb < 12 and ferritin is not None and ferritin > 100:
        evidence = [
            {"test": "Hemoglobin", "value": hb, "finding": "Below normal"},
            {"test": "Ferritin", "value": ferritin, "finding": "Normal/elevated (>100 ng/mL)"},
        ]
        confidence = "medium"

        if iron is not None and iron < 60:
            evidence.append({"test": "Iron", "value": iron, "finding": "Low (<60 mcg/dL)"})
            confidence = "high"

        if crp is not None and crp > 3:
            evidence.append({"test": "CRP", "value": crp, "finding": "Elevated (>3 mg/L)"})
            confidence = "high"

        return {
            "condition": "Anemia of Chronic Disease",
            "confidence": confidence,
            "category": "Hematology",
            "evidence": evidence,
            "reasoning": (
                "Low hemoglobin with normal/elevated ferritin suggests anemia of chronic "
                "disease rather than iron deficiency. Inflammatory markers may be elevated."
            ),
            "recommendation": "Evaluate for underlying chronic inflammatory or infectious conditions",
        }
    return None


# ── CARDIOVASCULAR RULES ────────────────────────────────────────────────────

def rule_cardiovascular_risk(labs: dict) -> Optional[list]:
    """Assess cardiovascular risk from lipid panel."""
    results = []
    ldl = _get_val(labs, "ldl")
    hdl = _get_val(labs, "hdl")
    tg = _get_val(labs, "triglycerides")
    chol = _get_val(labs, "total_cholesterol")

    # High LDL
    if ldl is not None and ldl > 100:
        if ldl > 190:
            confidence = "high"
            severity = "very high"
        elif ldl > 160:
            confidence = "high"
            severity = "high"
        elif ldl > 130:
            confidence = "medium"
            severity = "borderline high"
        else:
            confidence = "low"
            severity = "above optimal"

        results.append({
            "condition": f"Elevated LDL Cholesterol ({severity})",
            "confidence": confidence,
            "category": "Cardiovascular",
            "evidence": [{"test": "LDL", "value": ldl, "finding": f"{severity} (>100 mg/dL optimal)"}],
            "reasoning": (
                f"LDL cholesterol is {severity}. Elevated LDL is a primary risk factor "
                "for atherosclerotic cardiovascular disease (ASCVD). Risk increases "
                "progressively with higher LDL levels."
            ),
            "recommendation": "Lipid management consultation, lifestyle modifications, consider statin therapy",
        })

    # Low HDL
    if hdl is not None and hdl < 40:
        results.append({
            "condition": "Low HDL Cholesterol",
            "confidence": "medium",
            "category": "Cardiovascular",
            "evidence": [{"test": "HDL", "value": hdl, "finding": "Low (<40 mg/dL)"}],
            "reasoning": (
                "Low HDL is an independent cardiovascular risk factor. HDL has "
                "antiatherogenic properties and helps remove cholesterol from arteries."
            ),
            "recommendation": "Exercise, weight management, smoking cessation if applicable",
        })

    # High triglycerides
    if tg is not None and tg > 150:
        severity = "very high" if tg > 500 else "high" if tg > 200 else "borderline"
        results.append({
            "condition": f"Elevated Triglycerides ({severity})",
            "confidence": "high" if tg > 200 else "medium",
            "category": "Cardiovascular",
            "evidence": [{"test": "Triglycerides", "value": tg, "finding": f"{severity} (>150 mg/dL)"}],
            "reasoning": (
                "Elevated triglycerides increase cardiovascular risk and at very "
                "high levels (>500) increase pancreatitis risk."
            ),
            "recommendation": "Dietary modification (reduce sugar/alcohol), exercise, omega-3 supplementation",
        })

    return results if results else None


# ── KIDNEY FUNCTION RULES ──────────────────────────────────────────────────

def rule_kidney_dysfunction(labs: dict) -> Optional[list]:
    """Assess kidney function from creatinine, BUN, eGFR."""
    results = []
    creat = _get_val(labs, "creatinine")
    bun = _get_val(labs, "bun")
    egfr = _get_val(labs, "egfr")

    # Elevated creatinine
    if creat is not None and creat > 1.2:
        confidence = "high" if creat > 2.0 else "medium"
        results.append({
            "condition": "Elevated Creatinine — Possible Kidney Dysfunction",
            "confidence": confidence,
            "category": "Nephrology",
            "evidence": [{"test": "Creatinine", "value": creat, "finding": f"Elevated (>1.2 mg/dL)"}],
            "reasoning": (
                "Serum creatinine above normal range may indicate impaired glomerular "
                "filtration. Should be interpreted with eGFR and clinical context."
            ),
            "recommendation": "eGFR calculation, urinalysis, renal ultrasound if persistently elevated",
        })

    # Low eGFR → CKD staging
    if egfr is not None and egfr < 90:
        if egfr < 15:
            stage, confidence = "Stage 5 (Kidney Failure)", "high"
        elif egfr < 30:
            stage, confidence = "Stage 4 (Severe)", "high"
        elif egfr < 45:
            stage, confidence = "Stage 3b (Moderate-Severe)", "high"
        elif egfr < 60:
            stage, confidence = "Stage 3a (Moderate)", "medium"
        else:
            stage, confidence = "Stage 2 (Mild)", "low"

        results.append({
            "condition": f"Chronic Kidney Disease — {stage}",
            "confidence": confidence,
            "category": "Nephrology",
            "evidence": [{"test": "eGFR", "value": egfr, "finding": f"{stage}"}],
            "reasoning": (
                f"eGFR of {egfr} mL/min corresponds to CKD {stage}. "
                "Requires monitoring and management of contributing factors."
            ),
            "recommendation": "Nephrology referral, protein restriction assessment, avoid nephrotoxins",
        })

    # Elevated BUN
    if bun is not None and bun > 20 and (creat is None or creat > 1.2):
        results.append({
            "condition": "Elevated BUN",
            "confidence": "low",
            "category": "Nephrology",
            "evidence": [{"test": "BUN", "value": bun, "finding": "Elevated (>20 mg/dL)"}],
            "reasoning": (
                "Elevated BUN can indicate renal impairment, dehydration, "
                "or increased protein catabolism."
            ),
            "recommendation": "Assess hydration status, repeat with creatinine for BUN/creatinine ratio",
        })

    return results if results else None


# ── DIABETES RULES ─────────────────────────────────────────────────────────

def rule_diabetes_screening(labs: dict) -> Optional[list]:
    """Screen for prediabetes and diabetes."""
    results = []
    glucose = _get_val(labs, "glucose") or _get_val(labs, "fasting_glucose")
    hba1c = _get_val(labs, "hba1c")

    if hba1c is not None:
        if hba1c >= 6.5:
            results.append({
                "condition": "Diabetes Mellitus (HbA1c ≥ 6.5%)",
                "confidence": "high",
                "category": "Endocrinology",
                "evidence": [{"test": "HbA1c", "value": hba1c, "finding": f"Diabetic range (≥6.5%)"}],
                "reasoning": (
                    f"HbA1c of {hba1c}% meets the diagnostic threshold for diabetes mellitus. "
                    "HbA1c reflects average blood glucose over the past 2-3 months."
                ),
                "recommendation": "Comprehensive diabetes management — diet, exercise, medication review",
            })
        elif hba1c >= 5.7:
            results.append({
                "condition": "Prediabetes (HbA1c 5.7-6.4%)",
                "confidence": "high",
                "category": "Endocrinology",
                "evidence": [{"test": "HbA1c", "value": hba1c, "finding": "Prediabetic range (5.7-6.4%)"}],
                "reasoning": (
                    f"HbA1c of {hba1c}% falls in the prediabetes range. Without intervention, "
                    "there is an increased risk of progression to type 2 diabetes."
                ),
                "recommendation": "Lifestyle modifications, weight management, recheck in 3-6 months",
            })

    if glucose is not None:
        if glucose >= 126:
            # Only add if HbA1c didn't already flag diabetes
            if not any(r["condition"].startswith("Diabetes") for r in results):
                results.append({
                    "condition": "Elevated Fasting Glucose (≥126 mg/dL)",
                    "confidence": "high",
                    "category": "Endocrinology",
                    "evidence": [{"test": "Glucose", "value": glucose, "finding": "Diabetic range"}],
                    "reasoning": "Fasting glucose ≥126 mg/dL meets diabetes diagnostic criteria.",
                    "recommendation": "Confirm with repeat fasting glucose or HbA1c",
                })
        elif glucose >= 100:
            results.append({
                "condition": "Impaired Fasting Glucose (100-125 mg/dL)",
                "confidence": "medium",
                "category": "Endocrinology",
                "evidence": [{"test": "Glucose", "value": glucose, "finding": "Prediabetic range"}],
                "reasoning": "Fasting glucose 100-125 mg/dL suggests impaired fasting glucose.",
                "recommendation": "HbA1c test, oral glucose tolerance test",
            })

    return results if results else None


# ── LIVER FUNCTION RULES ──────────────────────────────────────────────────

def rule_liver_dysfunction(labs: dict) -> Optional[list]:
    """Assess liver function."""
    results = []
    alt = _get_val(labs, "alt")
    ast = _get_val(labs, "ast")
    alp = _get_val(labs, "alp")
    bilirubin = _get_val(labs, "bilirubin_total")
    albumin = _get_val(labs, "albumin")
    ggt = _get_val(labs, "ggt")

    # Hepatocellular pattern (ALT/AST elevation)
    if (alt is not None and alt > 56) or (ast is not None and ast > 40):
        evidence = []
        if alt is not None and alt > 56:
            evidence.append({"test": "ALT", "value": alt, "finding": "Elevated (>56 U/L)"})
        if ast is not None and ast > 40:
            evidence.append({"test": "AST", "value": ast, "finding": "Elevated (>40 U/L)"})

        max_elevation = max(
            (alt / 56 if alt else 0),
            (ast / 40 if ast else 0),
        )
        
        if max_elevation > 10:
            severity, confidence = "markedly elevated", "high"
        elif max_elevation > 3:
            severity, confidence = "moderately elevated", "high"
        else:
            severity, confidence = "mildly elevated", "medium"

        results.append({
            "condition": f"Hepatocellular Injury ({severity} transaminases)",
            "confidence": confidence,
            "category": "Hepatology",
            "evidence": evidence,
            "reasoning": (
                f"Transaminase elevation ({severity}) indicates hepatocellular injury. "
                "Differential includes fatty liver, viral hepatitis, medication-related, and alcohol-related."
            ),
            "recommendation": "Hepatitis panel, liver ultrasound, medication review, alcohol history",
        })

    # Cholestatic pattern (ALP + GGT elevated)
    if alp is not None and alp > 147 and ggt is not None and ggt > 48:
        results.append({
            "condition": "Cholestatic Pattern",
            "confidence": "medium",
            "category": "Hepatology",
            "evidence": [
                {"test": "ALP", "value": alp, "finding": "Elevated (>147 U/L)"},
                {"test": "GGT", "value": ggt, "finding": "Elevated (>48 U/L)"},
            ],
            "reasoning": (
                "Elevation of both ALP and GGT suggests cholestasis (biliary obstruction "
                "or intrahepatic cholestasis)."
            ),
            "recommendation": "Liver ultrasound, MRCP if obstruction suspected",
        })

    # Elevated bilirubin
    if bilirubin is not None and bilirubin > 1.2:
        results.append({
            "condition": "Hyperbilirubinemia",
            "confidence": "medium" if bilirubin > 2 else "low",
            "category": "Hepatology",
            "evidence": [{"test": "Total Bilirubin", "value": bilirubin, "finding": "Elevated (>1.2 mg/dL)"}],
            "reasoning": "Elevated bilirubin may indicate liver disease, hemolysis, or biliary obstruction.",
            "recommendation": "Direct/indirect bilirubin fractionation, complete liver panel",
        })

    # Low albumin
    if albumin is not None and albumin < 3.4:
        results.append({
            "condition": "Hypoalbuminemia",
            "confidence": "medium",
            "category": "Hepatology",
            "evidence": [{"test": "Albumin", "value": albumin, "finding": "Low (<3.4 g/dL)"}],
            "reasoning": (
                "Low albumin may indicate impaired liver synthetic function, "
                "malnutrition, or protein-losing conditions."
            ),
            "recommendation": "Assess nutritional status, liver function, urinary protein",
        })

    return results if results else None


# ── THYROID RULES ──────────────────────────────────────────────────────────

def rule_thyroid_dysfunction(labs: dict) -> Optional[list]:
    """Assess thyroid function."""
    results = []
    tsh = _get_val(labs, "tsh")
    t4 = _get_val(labs, "free_t4") or _get_val(labs, "t4")
    t3 = _get_val(labs, "free_t3") or _get_val(labs, "t3")

    if tsh is not None:
        if tsh > 4.0:
            confidence = "high" if tsh > 10 else "medium"
            evidence = [{"test": "TSH", "value": tsh, "finding": "Elevated (>4.0 mIU/L)"}]
            if t4 is not None and t4 < 0.8:
                evidence.append({"test": "Free T4", "value": t4, "finding": "Low"})
                confidence = "high"
            results.append({
                "condition": "Hypothyroidism (Elevated TSH)",
                "confidence": confidence,
                "category": "Endocrinology",
                "evidence": evidence,
                "reasoning": (
                    "Elevated TSH suggests the thyroid is underactive. The pituitary "
                    "produces more TSH to stimulate thyroid hormone production."
                ),
                "recommendation": "Free T4, thyroid antibodies (anti-TPO), clinical correlation",
            })
        elif tsh < 0.4:
            confidence = "high" if tsh < 0.1 else "medium"
            evidence = [{"test": "TSH", "value": tsh, "finding": "Suppressed (<0.4 mIU/L)"}]
            results.append({
                "condition": "Hyperthyroidism (Suppressed TSH)",
                "confidence": confidence,
                "category": "Endocrinology",
                "evidence": evidence,
                "reasoning": (
                    "Suppressed TSH suggests excessive thyroid hormone production. "
                    "The pituitary reduces TSH output in response to elevated T3/T4."
                ),
                "recommendation": "Free T4, Free T3, thyroid antibodies, thyroid uptake scan",
            })

    return results if results else None


# ── ELECTROLYTE RULES ──────────────────────────────────────────────────────

def rule_electrolyte_abnormalities(labs: dict) -> Optional[list]:
    """Detect electrolyte disturbances."""
    results = []

    checks = [
        ("sodium", 136, 145, "Hyponatremia", "Hypernatremia", "mEq/L"),
        ("potassium", 3.5, 5.0, "Hypokalemia", "Hyperkalemia", "mEq/L"),
        ("calcium", 8.5, 10.5, "Hypocalcemia", "Hypercalcemia", "mg/dL"),
    ]

    for test, low, high, low_name, high_name, unit in checks:
        val = _get_val(labs, test)
        if val is not None:
            if val < low:
                results.append({
                    "condition": low_name,
                    "confidence": "high" if _get_status(labs, test) in ("critical_low",) else "medium",
                    "category": "Electrolytes",
                    "evidence": [{"test": test.capitalize(), "value": val, "finding": f"Low (<{low} {unit})"}],
                    "reasoning": f"{low_name} detected. Can cause neuromuscular and cardiac symptoms.",
                    "recommendation": f"Monitor {test}, assess causes (medications, diet, renal function)",
                })
            elif val > high:
                results.append({
                    "condition": high_name,
                    "confidence": "high" if _get_status(labs, test) in ("critical_high",) else "medium",
                    "category": "Electrolytes",
                    "evidence": [{"test": test.capitalize(), "value": val, "finding": f"High (>{high} {unit})"}],
                    "reasoning": f"{high_name} detected. Requires clinical evaluation.",
                    "recommendation": f"Monitor {test}, ECG if potassium/calcium, assess underlying cause",
                })

    return results if results else None


# ── INFLAMMATORY MARKERS ───────────────────────────────────────────────────

def rule_inflammation(labs: dict) -> Optional[dict]:
    """Detect elevated inflammatory markers."""
    crp = _get_val(labs, "crp")
    esr = _get_val(labs, "esr")

    evidence = []
    if crp is not None and crp > 3:
        evidence.append({"test": "CRP", "value": crp, "finding": "Elevated (>3 mg/L)"})
    if esr is not None and esr > 20:
        evidence.append({"test": "ESR", "value": esr, "finding": "Elevated (>20 mm/hr)"})

    if evidence:
        return {
            "condition": "Elevated Inflammatory Markers",
            "confidence": "medium",
            "category": "Immunology",
            "evidence": evidence,
            "reasoning": (
                "Elevated inflammatory markers suggest active inflammation, infection, "
                "or autoimmune process. Non-specific but clinically significant."
            ),
            "recommendation": "Clinical correlation, consider infectious workup or autoimmune panel",
        }
    return None


# ── VITAMIN DEFICIENCY RULES ──────────────────────────────────────────────

def rule_vitamin_deficiencies(labs: dict) -> Optional[list]:
    """Detect vitamin deficiencies."""
    results = []

    vit_d = _get_val(labs, "vitamin_d")
    if vit_d is not None and vit_d < 30:
        severity = "severe deficiency" if vit_d < 10 else "deficiency" if vit_d < 20 else "insufficiency"
        results.append({
            "condition": f"Vitamin D {severity.title()}",
            "confidence": "high" if vit_d < 20 else "medium",
            "category": "Nutrition",
            "evidence": [{"test": "Vitamin D", "value": vit_d, "finding": f"{severity} (<30 ng/mL)"}],
            "reasoning": f"Vitamin D level indicates {severity}. Associated with bone disease, fatigue, and immune dysfunction.",
            "recommendation": "Vitamin D supplementation, calcium co-supplementation, recheck in 3 months",
        })

    uric = _get_val(labs, "uric_acid")
    if uric is not None and uric > 7:
        results.append({
            "condition": "Hyperuricemia",
            "confidence": "medium",
            "category": "Rheumatology",
            "evidence": [{"test": "Uric Acid", "value": uric, "finding": "Elevated (>7 mg/dL)"}],
            "reasoning": "Elevated uric acid increases risk for gout and nephrolithiasis.",
            "recommendation": "Dietary modification, hydration, monitor for gout symptoms",
        })

    return results if results else None


# ── WBC RULES ──────────────────────────────────────────────────────────────

def rule_wbc_abnormalities(labs: dict) -> Optional[dict]:
    """Detect WBC count abnormalities."""
    wbc = _get_val(labs, "wbc")
    if wbc is None:
        return None

    if wbc > 11:
        return {
            "condition": "Leukocytosis (Elevated WBC)",
            "confidence": "high" if wbc > 20 else "medium",
            "category": "Hematology",
            "evidence": [{"test": "WBC", "value": wbc, "finding": "Elevated (>11 K/uL)"}],
            "reasoning": "Elevated WBC count may indicate infection, inflammation, stress response, or hematologic disorder.",
            "recommendation": "CBC with differential, clinical correlation for infection source",
        }
    elif wbc < 4:
        return {
            "condition": "Leukopenia (Low WBC)",
            "confidence": "high" if wbc < 2 else "medium",
            "category": "Hematology",
            "evidence": [{"test": "WBC", "value": wbc, "finding": "Low (<4 K/uL)"}],
            "reasoning": "Low WBC increases infection susceptibility. May be viral, medication-related, or bone marrow disorder.",
            "recommendation": "CBC with differential, medication review, consider bone marrow evaluation if persistent",
        }
    return None


# ── PLATELET RULES ─────────────────────────────────────────────────────────

def rule_platelet_abnormalities(labs: dict) -> Optional[dict]:
    """Detect platelet count abnormalities."""
    plt = _get_val(labs, "platelets")
    if plt is None:
        return None

    if plt < 150:
        severity = "severe" if plt < 50 else "moderate" if plt < 100 else "mild"
        return {
            "condition": f"Thrombocytopenia ({severity})",
            "confidence": "high" if plt < 100 else "medium",
            "category": "Hematology",
            "evidence": [{"test": "Platelets", "value": plt, "finding": f"{severity} low (<150 K/uL)"}],
            "reasoning": f"Platelet count is {severity}ly low. Risk of bleeding increases significantly below 50 K/uL.",
            "recommendation": "Peripheral smear, reticulocyte count, assess for causes (medications, infections, liver disease)",
        }
    elif plt > 400:
        return {
            "condition": "Thrombocytosis",
            "confidence": "low",
            "category": "Hematology",
            "evidence": [{"test": "Platelets", "value": plt, "finding": "Elevated (>400 K/uL)"}],
            "reasoning": "Elevated platelets may be reactive (infection, inflammation, iron deficiency) or primary (myeloproliferative).",
            "recommendation": "Iron studies, inflammatory markers, consider hematology referral if persistent",
        }
    return None


# ── METABOLIC SYNDROME ─────────────────────────────────────────────────────

def rule_metabolic_syndrome(labs: dict) -> Optional[dict]:
    """Detect metabolic syndrome (3+ criteria)."""
    criteria_met = []
    glucose = _get_val(labs, "glucose") or _get_val(labs, "fasting_glucose")
    tg = _get_val(labs, "triglycerides")
    hdl = _get_val(labs, "hdl")
    hba1c = _get_val(labs, "hba1c")

    if glucose is not None and glucose >= 100:
        criteria_met.append({"test": "Glucose", "value": glucose, "finding": "≥100 mg/dL"})
    if hba1c is not None and hba1c >= 5.7:
        criteria_met.append({"test": "HbA1c", "value": hba1c, "finding": "≥5.7%"})
    if tg is not None and tg >= 150:
        criteria_met.append({"test": "Triglycerides", "value": tg, "finding": "≥150 mg/dL"})
    if hdl is not None and hdl < 40:
        criteria_met.append({"test": "HDL", "value": hdl, "finding": "<40 mg/dL"})

    if len(criteria_met) >= 2:
        return {
            "condition": "Metabolic Syndrome Risk",
            "confidence": "high" if len(criteria_met) >= 3 else "medium",
            "category": "Endocrinology",
            "evidence": criteria_met,
            "reasoning": (
                f"{len(criteria_met)} metabolic syndrome components detected. "
                "Metabolic syndrome significantly increases risk of cardiovascular disease "
                "and type 2 diabetes. Requires aggressive lifestyle intervention."
            ),
            "recommendation": "Comprehensive metabolic assessment, weight management, exercise program, dietary counseling",
        }
    return None


# ── CARDIAC MARKERS ────────────────────────────────────────────────────────

def rule_cardiac_markers(labs: dict) -> Optional[list]:
    """Detect elevated cardiac markers."""
    results = []
    troponin = _get_val(labs, "troponin_i")
    bnp = _get_val(labs, "bnp") or _get_val(labs, "nt_probnp")
    ck_mb = _get_val(labs, "ck_mb")
    homocysteine = _get_val(labs, "homocysteine")

    if troponin is not None and troponin > 0.04:
        results.append({
            "condition": "Elevated Troponin — Myocardial Injury",
            "confidence": "high",
            "category": "Cardiovascular",
            "evidence": [{"test": "Troponin I", "value": troponin, "finding": "Elevated (>0.04 ng/mL)"}],
            "reasoning": (
                "Elevated troponin indicates myocardial cell damage. In the appropriate "
                "clinical context, this may suggest acute coronary syndrome, myocarditis, "
                "PE, or other causes of myocardial injury."
            ),
            "recommendation": "URGENT: Serial troponins, 12-lead ECG, cardiology consultation",
        })

    if bnp is not None and bnp > 100:
        results.append({
            "condition": "Elevated BNP — Heart Failure Indicator",
            "confidence": "high" if bnp > 400 else "medium",
            "category": "Cardiovascular",
            "evidence": [{"test": "BNP", "value": bnp, "finding": "Elevated (>100 pg/mL)"}],
            "reasoning": (
                "Elevated BNP/NT-proBNP is a biomarker for cardiac wall stress and "
                "heart failure. Higher values correlate with worse cardiac function."
            ),
            "recommendation": "Echocardiogram, cardiology evaluation, assess volume status",
        })

    if homocysteine is not None and homocysteine > 15:
        results.append({
            "condition": "Hyperhomocysteinemia",
            "confidence": "medium",
            "category": "Cardiovascular",
            "evidence": [{"test": "Homocysteine", "value": homocysteine, "finding": "Elevated (>15 umol/L)"}],
            "reasoning": "Elevated homocysteine is an independent risk factor for cardiovascular disease and thrombosis.",
            "recommendation": "B12, B6, folate supplementation, recheck in 6 weeks",
        })

    return results if results else None


# ── COAGULATION ────────────────────────────────────────────────────────────

def rule_coagulation(labs: dict) -> Optional[list]:
    """Detect coagulation abnormalities."""
    results = []
    inr = _get_val(labs, "inr")
    pt = _get_val(labs, "pt")
    aptt = _get_val(labs, "aptt")
    d_dimer = _get_val(labs, "d_dimer")
    fibrinogen = _get_val(labs, "fibrinogen")

    if inr is not None and inr > 1.2:
        results.append({
            "condition": "Elevated INR — Coagulopathy",
            "confidence": "high" if inr > 3 else "medium",
            "category": "Hematology",
            "evidence": [{"test": "INR", "value": inr, "finding": f"Elevated (>1.2)"}],
            "reasoning": (
                "Elevated INR indicates prolonged clotting time. May be due to "
                "anticoagulant therapy, liver disease, or coagulation factor deficiency."
            ),
            "recommendation": "Review anticoagulant medications, liver function tests, factor assays if unexplained",
        })

    if d_dimer is not None and d_dimer > 0.5:
        results.append({
            "condition": "Elevated D-Dimer",
            "confidence": "medium",
            "category": "Hematology",
            "evidence": [{"test": "D-Dimer", "value": d_dimer, "finding": "Elevated (>0.5 mg/L)"}],
            "reasoning": (
                "Elevated D-dimer indicates fibrin degradation and active clot "
                "formation/breakdown. While non-specific, it is useful for ruling out DVT/PE."
            ),
            "recommendation": "Clinical assessment for thromboembolism, consider ultrasound or CT angiography",
        })

    if fibrinogen is not None and fibrinogen < 200:
        results.append({
            "condition": "Low Fibrinogen — Bleeding Risk",
            "confidence": "high" if fibrinogen < 100 else "medium",
            "category": "Hematology",
            "evidence": [{"test": "Fibrinogen", "value": fibrinogen, "finding": "Low (<200 mg/dL)"}],
            "reasoning": "Low fibrinogen increases bleeding risk and may indicate DIC, liver disease, or consumptive coagulopathy.",
            "recommendation": "Assess for DIC (check platelets, PT, D-dimer), liver function evaluation",
        })

    return results if results else None


# ── PANCREATIC ────────────────────────────────────────────────────────────

def rule_pancreatic(labs: dict) -> Optional[dict]:
    """Detect pancreatic injury."""
    amylase = _get_val(labs, "amylase")
    lipase = _get_val(labs, "lipase")

    if lipase is not None and lipase > 60:
        evidence = [{"test": "Lipase", "value": lipase, "finding": "Elevated (>60 U/L)"}]
        if amylase is not None and amylase > 100:
            evidence.append({"test": "Amylase", "value": amylase, "finding": "Elevated (>100 U/L)"})
        return {
            "condition": "Elevated Pancreatic Enzymes — Possible Pancreatitis",
            "confidence": "high" if lipase > 180 else "medium",
            "category": "Gastrointestinal",
            "evidence": evidence,
            "reasoning": (
                "Elevated lipase (and/or amylase) suggests pancreatic injury. "
                "Lipase is more specific for pancreatitis. Three-fold elevation is highly suggestive."
            ),
            "recommendation": "Abdominal imaging (CT/US), NPO if acute, surgical consultation if severe",
        }
    return None


# ── MAGNESIUM/PHOSPHORUS ──────────────────────────────────────────────────

def rule_magnesium_phosphorus(labs: dict) -> Optional[list]:
    """Detect magnesium and phosphorus abnormalities."""
    results = []
    mg = _get_val(labs, "magnesium")
    phos = _get_val(labs, "phosphorus")

    if mg is not None and mg < 1.7:
        results.append({
            "condition": "Hypomagnesemia",
            "confidence": "high" if mg < 1.0 else "medium",
            "category": "Electrolytes",
            "evidence": [{"test": "Magnesium", "value": mg, "finding": "Low (<1.7 mg/dL)"}],
            "reasoning": "Low magnesium can cause arrhythmias, muscle cramps, and worsen hypokalemia/hypocalcemia.",
            "recommendation": "Magnesium supplementation, assess diuretic use and GI losses",
        })

    if phos is not None and phos < 2.5:
        results.append({
            "condition": "Hypophosphatemia",
            "confidence": "medium",
            "category": "Electrolytes",
            "evidence": [{"test": "Phosphorus", "value": phos, "finding": "Low (<2.5 mg/dL)"}],
            "reasoning": "Low phosphorus can cause muscle weakness, respiratory failure in severe cases.",
            "recommendation": "Phosphorus supplementation, assess nutritional status and renal function",
        })

    return results if results else None


# ── PSA SCREENING ──────────────────────────────────────────────────────────

def rule_psa_screening(labs: dict) -> Optional[dict]:
    """Screen for elevated PSA."""
    psa = _get_val(labs, "psa")
    if psa is not None and psa > 4.0:
        return {
            "condition": "Elevated PSA — Prostate Evaluation Needed",
            "confidence": "high" if psa > 10 else "medium",
            "category": "Urology",
            "evidence": [{"test": "PSA", "value": psa, "finding": "Elevated (>4.0 ng/mL)"}],
            "reasoning": (
                "Elevated PSA may indicate prostate cancer, benign prostatic hyperplasia, "
                "or prostatitis. Further evaluation is needed."
            ),
            "recommendation": "Urology referral, digital rectal exam, consider prostate MRI/biopsy",
        }
    return None


# ── Register all rules ─────────────────────────────────────────────────────

ALL_RULES = [
    rule_iron_deficiency_anemia,
    rule_b12_folate_anemia,
    rule_anemia_of_chronic_disease,
    rule_cardiovascular_risk,
    rule_kidney_dysfunction,
    rule_diabetes_screening,
    rule_liver_dysfunction,
    rule_thyroid_dysfunction,
    rule_electrolyte_abnormalities,
    rule_inflammation,
    rule_vitamin_deficiencies,
    rule_wbc_abnormalities,
    rule_platelet_abnormalities,
    # V11 — new rules
    rule_metabolic_syndrome,
    rule_cardiac_markers,
    rule_coagulation,
    rule_pancreatic,
    rule_magnesium_phosphorus,
    rule_psa_screening,
]


def generate_differential_diagnosis(insights: list[dict]) -> list[dict]:
    """
    Generate a ranked differential diagnosis from clinical insights.
    Groups conditions by organ system and ranks by confidence.
    """
    if not insights:
        return []

    confidence_score = {"high": 3, "medium": 2, "low": 1}
    
    # Group by category with summed confidence
    categories = {}
    for insight in insights:
        cat = insight.get("category", "General")
        if cat not in categories:
            categories[cat] = {"category": cat, "conditions": [], "total_score": 0}
        categories[cat]["conditions"].append({
            "condition": insight["condition"],
            "confidence": insight["confidence"],
        })
        categories[cat]["total_score"] += confidence_score.get(insight["confidence"], 0)

    # Sort by total score descending
    ranked = sorted(categories.values(), key=lambda x: x["total_score"], reverse=True)
    return ranked
