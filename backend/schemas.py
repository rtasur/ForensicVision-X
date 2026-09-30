# =========================================================
# PYDANTIC SCHEMAS
# =========================================================

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class CaseCreate(BaseModel):
    case_name: str
    examiner_name: str


class NormalizeRequest(BaseModel):
    clock_offset_seconds: int


class TriageDecision(BaseModel):
    decision: str

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: str) -> str:
        value = value.upper()
        if value not in {"ACCEPT", "REJECT"}:
            raise ValueError("Decision must be ACCEPT or REJECT")
        return value
