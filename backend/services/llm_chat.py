"""
MedBios AI — LLM Chat Service
Uses Google Gemini API for context-aware medical chat.
Falls back to keyword-based responses when no API key is configured.
"""
import logging
from config import GOOGLE_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    """Lazy-initialize the Gemini model."""
    global _model
    if _model is not None:
        return _model
    if not GOOGLE_API_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        _model = genai.GenerativeModel(LLM_MODEL)
        logger.info(f"Gemini model initialized: {LLM_MODEL}")
        return _model
    except Exception as e:
        logger.warning(f"Failed to initialize Gemini: {e}")
        return None


def is_llm_available() -> bool:
    """Check if LLM is configured and available."""
    return bool(GOOGLE_API_KEY) and _get_model() is not None


async def llm_chat(message: str, context: dict) -> str | None:
    """
    Send a message to the LLM with medical context.
    Returns the response string, or None if LLM is unavailable.

    Args:
        message: User's question
        context: Dict with lab_values, insights, risk_scores, patient_info
    """
    model = _get_model()
    if model is None:
        return None

    # Build context prompt
    lab_summary = ""
    for lab in context.get("lab_values", [])[:20]:
        status = lab.get("status", "normal")
        lab_summary += f"- {lab.get('test_name', 'Unknown')}: {lab.get('value', 'N/A')} {lab.get('unit', '')} [{status}]\n"

    insights_summary = ""
    for ins in context.get("insights", [])[:10]:
        insights_summary += f"- {ins.get('condition', '')}: {ins.get('reasoning', '')} (confidence: {ins.get('confidence', '')})\n"

    risk_info = ""
    risk_scores = context.get("risk_scores", {})
    if isinstance(risk_scores, dict):
        risk_info = f"Overall risk: {risk_scores.get('overall', 'N/A')}%\n"
        for system, data in risk_scores.get("organ_systems", risk_scores).items():
            if isinstance(data, dict) and data.get("score", 0) > 0:
                risk_info += f"- {system}: {data.get('score', 0)}% ({data.get('level', '')})\n"

    patient = context.get("patient_info", {})
    patient_line = ""
    if patient.get("age") or patient.get("gender"):
        patient_line = f"Patient: {patient.get('name', 'Unknown')}, {patient.get('age', 'N/A')} years, {patient.get('gender', 'N/A')}\n"

    system_prompt = f"""You are MedBios AI, a clinical decision support assistant. You help healthcare professionals and patients understand medical lab reports.

IMPORTANT RULES:
- Always include a disclaimer that your responses are for informational purposes only and not a substitute for professional medical advice.
- Be concise but thorough. Use medical terminology appropriately.
- Reference specific lab values and findings from the patient's report when answering.
- If asked about something not in the report, say so clearly.

PATIENT REPORT CONTEXT:
{patient_line}
Lab Values:
{lab_summary or 'No lab values available'}

Clinical Insights:
{insights_summary or 'No insights generated'}

Risk Assessment:
{risk_info or 'No risk scores available'}
"""

    try:
        response = model.generate_content(
            [system_prompt, f"Patient question: {message}"],
            generation_config={
                "max_output_tokens": 500,
                "temperature": 0.3,
            },
        )
        return response.text
    except Exception as e:
        logger.error(f"LLM chat failed: {e}")
        return None
