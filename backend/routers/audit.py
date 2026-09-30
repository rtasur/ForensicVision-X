# =========================================================
# AUDIT ROUTES
# =========================================================

import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog, Case, User
from security import ensure_case_access, get_current_user, require_role


router = APIRouter(prefix="/api/audit", tags=["Audit / Chain of Custody"])


def _get_case_or_404(case_id: int, db: Session, user: User) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    ensure_case_access(case, user)
    return case


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _new_audit_hash(
    previous_hash: str,
    action: str,
    timestamp,
    evidence_id,
) -> str:
    """Phase 5.5 hash formula: SHA256(previous + action + timestamp + evidence_id)."""
    payload = (
        f"{previous_hash}"
        f"{action}"
        f"{timestamp.isoformat()}"
        f"{evidence_id}"
    )
    return _sha256_text(payload)


def _legacy_audit_hash(
    previous_hash: str,
    case_id: int,
    action: str,
    timestamp,
    evidence_id,
) -> str:
    """Compatibility check for audit entries created before Phase 5.5."""
    payload = (
        f"{case_id}|"
        f"{evidence_id}|"
        f"{action}|"
        f"{timestamp.isoformat()}|"
        f"{previous_hash}"
    )
    return _sha256_text(payload)


def create_audit_log(
    db: Session,
    case_id: int,
    evidence_id: int | None,
    action: str,
) -> AuditLog:
    """Create a hash-chained audit record using the Phase 5.5 formula."""
    timestamp = datetime.now()

    previous = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id)
        .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
        .first()
    )
    previous_hash = previous.entry_hash if previous else ""

    entry_hash = _new_audit_hash(
        previous_hash,
        action,
        timestamp,
        evidence_id,
    )

    log = AuditLog(
        case_id=case_id,
        evidence_id=evidence_id,
        action=action,
        timestamp=timestamp,
        entry_hash=entry_hash,
    )

    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{case_id}")
def get_audit_logs(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(case_id, db, current_user)

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case.id)
        .order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
        .all()
    )

    return {
        "case_id": case.id,
        "audit_count": len(logs),
        "audit_logs": [
            {
                "id": log.id,
                "case_id": log.case_id,
                "evidence_id": log.evidence_id,
                "action": log.action,
                "timestamp": log.timestamp,
                "entry_hash": log.entry_hash,
            }
            for log in logs
        ],
    }


@router.get("/{case_id}/verify")
def verify_audit_chain(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(["EXAMINER", "REVIEWER", "ADMIN"])
    ),
):
    case = _get_case_or_404(case_id, db, current_user)

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case.id)
        .order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
        .all()
    )

    previous_hash = ""

    for log in logs:
        expected_hash = _new_audit_hash(
            previous_hash,
            log.action,
            log.timestamp,
            log.evidence_id,
        )

        # Existing pre-hardening records were generated with the legacy
        # formula. Accept them only when that legacy formula also verifies.
        if log.entry_hash != expected_hash:
            legacy_hash = _legacy_audit_hash(
                previous_hash,
                case.id,
                log.action,
                log.timestamp,
                log.evidence_id,
            )
            if log.entry_hash != legacy_hash:
                return {
                    "case_id": case.id,
                    "verified": False,
                    "failed_entry_id": log.id,
                }

        previous_hash = log.entry_hash

    return {
        "case_id": case.id,
        "verified": True,
        "entries_checked": len(logs),
    }
