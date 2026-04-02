"""
MedBios AI — Configuration
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR / 'medbios.db'}")

# API
API_PREFIX = "/api"
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://med-bios-ai-djn7.vercel.app"
).split(",")

# OCR
TESSERACT_CMD = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

# App
APP_NAME = "MedBios AI"
APP_VERSION = "1.1.0"
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# Auth
SECRET_KEY = os.getenv("SECRET_KEY", "medbios-dev-secret-change-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24h

# LLM
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")
