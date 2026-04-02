"""
MedBios AI — Pydantic Request/Response Schemas
Type-safe validation for API endpoints.
"""
from pydantic import BaseModel, Field


# ── Request Schemas ──

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message")


class DrugInteractionRequest(BaseModel):
    medications: list[str] = Field(..., min_length=1, max_length=20, description="List of medication names")


class DrugLabInteractionRequest(BaseModel):
    medications: list[str] = Field(..., min_length=1, max_length=20)
    lab_values: list[dict] = Field(default_factory=list)


# ── Response Schemas ──

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


class ReportSummary(BaseModel):
    id: str
    filename: str
    document_type: str | None = None
    status: str
    created_at: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    python: str
    platform: str
    services: dict[str, str]
    database: str
    custom_rules_loaded: int
