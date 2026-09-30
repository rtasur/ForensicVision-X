# =========================================================
# CASE ROUTES + FORENSIC REPORT
# =========================================================

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from fpdf import FPDF
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog, Case, Evidence, Triage, User
from schemas import CaseCreate
from security import ensure_case_access, get_current_user, require_role
from routers.audit import create_audit_log


BASE_DIR = Path(__file__).resolve().parents[1]
REPORT_DIR = BASE_DIR / "reports"
REPORT_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/api/cases", tags=["Cases"])


def _get_case_or_404(case_id: int, db: Session, user: User) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    ensure_case_access(case, user)
    return case


@router.post("")
def create_case(
    case_data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EXAMINER", "ADMIN"])),
):
    case = Case(
        case_name=case_data.case_name,
        examiner_name=case_data.examiner_name,
        owner_id=current_user.id,
    )

    db.add(case)
    db.commit()
    db.refresh(case)

    create_audit_log(
        db=db,
        case_id=case.id,
        evidence_id=None,
        action="CASE_CREATED",
    )

    return {
        "id": case.id,
        "case_name": case.case_name,
        "examiner_name": case.examiner_name,
        "owner_id": case.owner_id,
        "created_at": case.created_at,
    }


@router.get("/{case_id}")
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(case_id, db, current_user)

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.case_id == case_id)
        .order_by(Evidence.id.asc())
        .all()
    )

    return {
        "id": case.id,
        "case_name": case.case_name,
        "examiner_name": case.examiner_name,
        "owner_id": case.owner_id,
        "created_at": case.created_at,
        "evidence": [
            {
                "id": item.id,
                "filename": item.filename,
                "original_hash": item.original_hash,
                "status": item.status,
                "clock_offset": item.clock_offset,
                "metadata": json.loads(item.metadata_json or "{}"),
            }
            for item in evidence_items
        ],
    }


@router.get("/{case_id}/timeline")
def get_case_timeline(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(case_id, db, current_user)

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.case_id == case.id)
        .order_by(Evidence.id.asc())
        .all()
    )

    if not evidence_items:
        return {"case_id": case.id, "event_count": 0, "timeline": []}

    simulated_events = [
        {"offset_seconds": 2, "event_type": "Motion Detected"},
        {"offset_seconds": 5, "event_type": "Person Detected"},
        {"offset_seconds": 8, "event_type": "Vehicle Detected"},
    ]

    timeline = []

    for evidence in evidence_items:
        base_time = datetime(2026, 9, 30, 10, 0, 0)
        dvr_metadata = {}

        try:
            metadata = json.loads(evidence.metadata_json or "{}")
            dvr_metadata = metadata.get("dvr_metadata", {})
            recording_start = dvr_metadata.get("recording_start")
            if recording_start:
                base_time = datetime.fromisoformat(recording_start)
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

        clock_offset = int(evidence.clock_offset or 0)

        for event in simulated_events:
            original_dt = base_time + timedelta(
                seconds=event["offset_seconds"]
            )
            normalized_dt = original_dt + timedelta(
                seconds=clock_offset
            )

            timeline.append(
                {
                    "evidence_id": evidence.id,
                    "filename": evidence.filename,
                    "camera_id": dvr_metadata.get(
                        "camera_id",
                        f"CAM-{evidence.id:02d}",
                    ),
                    "event_type": event["event_type"],
                    "original_time": original_dt.isoformat(),
                    "normalized_time": normalized_dt.isoformat(),
                    "clock_offset_seconds": clock_offset,
                }
            )

    timeline.sort(key=lambda event: event["normalized_time"])

    return {
        "case_id": case.id,
        "event_count": len(timeline),
        "timeline": timeline,
    }


def safe_pdf_text(value) -> str:
    if value is None:
        return ""

    text = str(value)
    replacements = {
        "–": "-",
        "—": "-",
        "•": "-",
        "→": "->",
        "✓": "[OK]",
        "×": "x",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text.encode("latin-1", "replace").decode("latin-1")


def add_pdf_section_title(pdf: FPDF, title: str):
    pdf.set_fill_color(35, 78, 125)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(
        0,
        8,
        safe_pdf_text(title),
        new_x="LMARGIN",
        new_y="NEXT",
        fill=True,
    )
    pdf.set_text_color(0, 0, 0)
    pdf.ln(3)


def generate_forensic_report(
    case: Case,
    evidence_items: list[Evidence],
    audit_logs: list[AuditLog],
    accepted_findings: list[Triage],
    output_path: Path,
) -> Path:
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(35, 78, 125)
    pdf.cell(
        0,
        10,
        "FORENSICVISION-X EVIDENCE REPORT",
        new_x="LMARGIN",
        new_y="NEXT",
        align="C",
    )

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(
        0,
        6,
        "SIH26150 CCTV Digital Forensics Prototype",
        new_x="LMARGIN",
        new_y="NEXT",
        align="C",
    )
    pdf.ln(6)
    pdf.set_text_color(0, 0, 0)

    add_pdf_section_title(pdf, "CASE INFORMATION")

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 7, "Case ID:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(90, 7, safe_pdf_text(case.id))
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 7, "Examiner:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        0,
        7,
        safe_pdf_text(case.examiner_name),
        new_x="LMARGIN",
        new_y="NEXT",
    )

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 7, "Case Name:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(90, 7, safe_pdf_text(case.case_name))
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(35, 7, "Created:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        0,
        7,
        safe_pdf_text(case.created_at),
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(5)

    add_pdf_section_title(pdf, "EVIDENCE")

    widths = [15, 48, 70, 38, 30, 30, 30]
    headers = [
        "ID",
        "Filename",
        "SHA-256",
        "Vendor",
        "Camera",
        "Status",
        "Clock Offset",
    ]

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(220, 230, 240)
    for header, width in zip(headers, widths):
        pdf.cell(width, 8, header, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 7)
    for evidence in evidence_items:
        try:
            metadata = json.loads(evidence.metadata_json or "{}")
        except json.JSONDecodeError:
            metadata = {}

        oem = metadata.get("oem", {})
        dvr = metadata.get("dvr_metadata", {})
        vendor = oem.get("vendor", dvr.get("vendor", "Unknown"))
        camera_id = dvr.get("camera_id", "-")

        values = [
            evidence.id,
            evidence.filename,
            evidence.original_hash,
            vendor,
            camera_id,
            evidence.status,
            f"{evidence.clock_offset:+.0f} sec",
        ]

        for value, width in zip(values, widths):
            pdf.cell(
                width,
                8,
                safe_pdf_text(value),
                border=1,
                align="C" if width in {15, 30} else "L",
            )
        pdf.ln()

    pdf.ln(5)

    add_pdf_section_title(pdf, "CLOCK OFFSETS APPLIED")
    pdf.set_font("Helvetica", "", 9)
    for evidence in evidence_items:
        try:
            metadata = json.loads(evidence.metadata_json or "{}")
        except json.JSONDecodeError:
            metadata = {}
        dvr = metadata.get("dvr_metadata", {})
        camera_id = dvr.get("camera_id", f"Evidence-{evidence.id}")
        pdf.cell(50, 7, safe_pdf_text(camera_id))
        pdf.cell(
            80,
            7,
            safe_pdf_text(
                f"Applied offset: {evidence.clock_offset:+.0f} seconds"
            ),
            new_x="LMARGIN",
            new_y="NEXT",
        )

    pdf.ln(5)

    add_pdf_section_title(pdf, "ACCEPTED AI FINDINGS")
    if not accepted_findings:
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(
            0,
            7,
            "No AI findings have been accepted.",
            new_x="LMARGIN",
            new_y="NEXT",
        )
    else:
        widths = [25, 25, 45, 35, 70]
        headers = [
            "Triage ID",
            "Evidence ID",
            "Finding",
            "Confidence",
            "Bounding Box",
        ]
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(220, 230, 240)
        for header, width in zip(headers, widths):
            pdf.cell(width, 8, header, border=1, fill=True, align="C")
        pdf.ln()

        pdf.set_font("Helvetica", "", 8)
        for finding in accepted_findings:
            values = [
                finding.id,
                finding.evidence_id,
                finding.label,
                f"{finding.confidence * 100:.1f}%",
                finding.bbox_json,
            ]
            for value, width in zip(values, widths):
                pdf.cell(width, 8, safe_pdf_text(value), border=1)
            pdf.ln()

    pdf.ln(5)

    add_pdf_section_title(pdf, "CHAIN OF CUSTODY / AUDIT TRAIL")
    if not audit_logs:
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(
            0,
            7,
            "No audit records found.",
            new_x="LMARGIN",
            new_y="NEXT",
        )
    else:
        widths = [15, 20, 100, 55, 85]
        headers = ["ID", "Evidence", "Action", "Timestamp", "Entry Hash"]
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_fill_color(220, 230, 240)
        for header, width in zip(headers, widths):
            pdf.cell(width, 8, header, border=1, fill=True, align="C")
        pdf.ln()

        pdf.set_font("Helvetica", "", 6)
        for log in audit_logs:
            values = [
                log.id,
                log.evidence_id if log.evidence_id is not None else "-",
                log.action,
                log.timestamp,
                log.entry_hash,
            ]
            for value, width in zip(values, widths):
                pdf.cell(width, 8, safe_pdf_text(value), border=1)
            pdf.ln()

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        safe_pdf_text(
            "This report was generated by ForensicVision-X Lite. "
            "AI findings are examiner-reviewed. Original evidence "
            "hashes are retained for integrity and provenance."
        ),
    )
    pdf.set_text_color(0, 0, 0)
    pdf.output(str(output_path))
    return output_path


@router.get("/{case_id}/report")
def generate_case_report(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(case_id, db, current_user)

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.case_id == case.id)
        .order_by(Evidence.id.asc())
        .all()
    )

    audit_logs = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case.id)
        .order_by(AuditLog.timestamp.asc(), AuditLog.id.asc())
        .all()
    )

    evidence_ids = [item.id for item in evidence_items]
    accepted_findings = []
    if evidence_ids:
        accepted_findings = (
            db.query(Triage)
            .filter(
                Triage.evidence_id.in_(evidence_ids),
                Triage.decision == "ACCEPT",
            )
            .order_by(Triage.id.asc())
            .all()
        )

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_filename = f"forensic_report_case_{case.id}_{timestamp}.pdf"
    report_path = REPORT_DIR / report_filename

    try:
        generate_forensic_report(
            case=case,
            evidence_items=evidence_items,
            audit_logs=audit_logs,
            accepted_findings=accepted_findings,
            output_path=report_path,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {exc}",
        )

    return FileResponse(
        path=report_path,
        media_type="application/pdf",
        filename=report_filename,
    )
