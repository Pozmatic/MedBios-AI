"""
MedBios AI — FastAPI Application Entrypoint
AI-powered clinical report intelligence platform
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import APP_NAME, APP_VERSION, CORS_ORIGINS, API_PREFIX
from database import init_db

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
    RATE_LIMITING = True
except ImportError:
    limiter = None
    RATE_LIMITING = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI-powered clinical report intelligence platform",
    lifespan=lifespan,
)

# Rate limiting
if RATE_LIMITING and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
from routers.reports import router as reports_router  # noqa: E402
from routers.auth import router as auth_router  # noqa: E402

app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
app.include_router(reports_router, prefix=f"{API_PREFIX}/reports", tags=["Reports"])


@app.get("/")
async def root():
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "endpoints": {
            "register": f"{API_PREFIX}/auth/register",
            "login": f"{API_PREFIX}/auth/login",
            "upload_report": f"{API_PREFIX}/reports/upload",
            "list_reports": f"{API_PREFIX}/reports",
            "docs": "/docs",
        }
    }


@app.get("/health")
async def health():
    import platform
    import sys
    from services.knowledge_graph import get_full_graph_stats
    from services.reasoning_engine import _load_custom_rules, ALL_RULES
    from services.llm_chat import is_llm_available
    kg = get_full_graph_stats()
    custom_rules = _load_custom_rules()
    db_status = "connected"
    try:
        from database import engine as async_engine
        async with async_engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "unavailable"
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "python": sys.version.split()[0],
        "platform": platform.system(),
        "database": db_status,
        "auth": "JWT (python-jose + bcrypt)",
        "rate_limiting": "active" if RATE_LIMITING else "disabled (slowapi not installed)",
        "custom_rules_loaded": len(custom_rules),
        "services": {
            "ocr": "active (pdfplumber + tesseract fallback)",
            "nlp": "active (100+ lab test aliases)",
            "reasoning_engine": f"active ({len(ALL_RULES)} built-in + {len(custom_rules)} custom rules)",
            "risk_scorer": "active (age/gender-aware)",
            "knowledge_graph": f"active ({kg.get('total_nodes', 0)} nodes, {kg.get('total_edges', 0)} edges)",
            "drug_interactions": "active (25+ pairs, 65+ aliases)",
            "trend_analysis": "active",
            "pdf_export": "active",
            "chat": f"active ({'LLM (Gemini)' if is_llm_available() else 'keyword-based fallback'})",
        },
    }
