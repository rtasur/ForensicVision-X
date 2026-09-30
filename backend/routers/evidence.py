# =========================================================
# EVIDENCE / TIMELINE / TRIAGE ROUTES
# =========================================================

import hashlib
import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Case, Evidence, Triage, User
from schemas import NormalizeRequest, TriageDecision
from security import ensure_case_access, get_current_user, require_role
from routers.audit import create_audit_log


BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"
ACQUIRED_DIR = BASE_DIR / "acquired"
UPLOAD_DIR.mkdir(exist_ok=True)
ACQUIRED_DIR.mkdir(exist_ok=True)

MAX_UPLOAD_SIZE = 500 * 1024 * 1024

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mkv", ".mov"}
ALLOWED_EVIDENCE_EXTENSIONS = ALLOWED_VIDEO_EXTENSIONS | {".json"}

ALLOWED_VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/x-msvideo",
    "video/x-matroska",
    "video/quicktime",
    "application/octet-stream",
}

ALLOWED_JSON_MIME_TYPES = {
    "application/json",
    "text/json",
}

router = APIRouter(tags=["Evidence / Triage"])


def calculate_sha256_stream(output_path: Path, upload: UploadFile) -> tuple[str, int]:
    sha256 = hashlib.sha256()
    total_size = 0

    with output_path.open("wb") as output:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break

            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                raise ValueError("Upload exceeds the 500 MB size limit")

            output.write(chunk)
            sha256.update(chunk)

    return sha256.hexdigest(), total_size


def parse_sidecar_metadata(content: bytes) -> dict:
    try:
        metadata = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Invalid metadata JSON: {exc}")

    if not isinstance(metadata, dict):
        raise ValueError("Metadata JSON must contain an object")

    return metadata


def extract_video_metadata(file_path: Path) -> dict:
    cap = cv2.VideoCapture(str(file_path))
    if not cap.isOpened():
        raise ValueError("Unable to open video file with OpenCV")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        duration = frame_count / fps if fps and fps > 0 else 0.0

        return {
            "fps": round(float(fps), 3),
            "frame_count": int(frame_count),
            "width": int(width),
            "height": int(height),
            "resolution": f"{int(width)}x{int(height)}",
            "duration": round(float(duration), 3),
        }
    finally:
        cap.release()


def identify_oem_profile(metadata: dict) -> dict:
    vendor = metadata.get("vendor", "Unknown Vendor")
    profiles = {
        "Vendor-A": {
            "profile_id": "VENDOR_A_V1",
            "vendor": "Vendor-A",
            "parser": "MockAdapter",
        },
        "Vendor-B": {
            "profile_id": "VENDOR_B_V1",
            "vendor": "Vendor-B",
            "parser": "MockAdapter",
        },
    }
    return profiles.get(
        vendor,
        {
            "profile_id": "GENERIC_V1",
            "vendor": vendor,
            "parser": "GenericMockAdapter",
        },
    )



def find_evidence_file(evidence: Evidence) -> Path | None:
    try:
        metadata = json.loads(evidence.metadata_json or "{}")
    except json.JSONDecodeError:
        metadata = {}

    storage_filename = metadata.get("storage_filename")
    if storage_filename:
        path = UPLOAD_DIR / Path(storage_filename).name
        if path.exists():
            return path

    # Backward compatibility for evidence uploaded before Phase 5.5.
    direct_path = UPLOAD_DIR / evidence.filename
    if direct_path.exists():
        return direct_path

    matches = list(UPLOAD_DIR.glob(f"*_{Path(evidence.filename).name}"))
    if not matches:
        return None

    matches.sort(
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    return matches[0]


def extract_middle_frame(video_path: Path):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError("Unable to open video file")

    try:
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_count <= 0:
            raise ValueError("Video contains no readable frames")

        middle_index = frame_count // 2
        cap.set(cv2.CAP_PROP_POS_FRAMES, middle_index)
        success, frame = cap.read()

        if not success or frame is None:
            raise ValueError("Unable to read middle frame")

        return frame, middle_index, frame_count
    finally:
        cap.release()


YOLO_MODEL = None


def get_yolo_model():
    global YOLO_MODEL

    if YOLO_MODEL is not None:
        return YOLO_MODEL

    try:
        from ultralytics import YOLO
        YOLO_MODEL = YOLO("yolov8n.pt")
        return YOLO_MODEL
    except Exception as exc:
        raise RuntimeError(f"Unable to load YOLOv8n: {exc}")


def run_yolo_detection(frame):
    model = get_yolo_model()
    results = model.predict(
        source=frame,
        imgsz=640,
        conf=0.25,
        verbose=False,
    )

    if not results or results[0].boxes is None:
        return []

    result = results[0]
    vehicle_classes = {"car", "motorcycle", "bus", "truck"}
    detections = []

    xyxy = result.boxes.xyxy.cpu().numpy()
    confidences = result.boxes.conf.cpu().numpy()
    class_ids = result.boxes.cls.cpu().numpy()

    for box, confidence, class_id in zip(
        xyxy,
        confidences,
        class_ids,
    ):
        source_class = result.names[int(class_id)]

        if source_class == "person":
            label = "person"
        elif source_class in vehicle_classes:
            label = "vehicle"
        else:
            continue

        detections.append(
            {
                "label": label,
                "source_class": source_class,
                "confidence": round(float(confidence), 4),
                "bbox": [
                    int(box[0]),
                    int(box[1]),
                    int(box[2]),
                    int(box[3]),
                ],
            }
        )

    return detections


def get_mock_detections(frame):
    height, width = frame.shape[:2]
    return [
        {
            "label": "person",
            "source_class": "mock_person",
            "confidence": 0.97,
            "bbox": [
                int(width * 0.30),
                int(height * 0.20),
                int(width * 0.55),
                int(height * 0.80),
            ],
        }
    ]


def annotate_frame(frame, detections):
    annotated = frame.copy()

    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        label = detection["label"]
        confidence = detection["confidence"]
        text = f"{label} {confidence * 100:.1f}%"

        cv2.rectangle(
            annotated,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            3,
        )
        cv2.putText(
            annotated,
            text,
            (x1, max(30, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )

    return annotated


def _get_case_for_user(
    case_id: int,
    db: Session,
    user: User,
) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    ensure_case_access(case, user)
    return case


def _get_evidence_for_user(
    evidence_id: int,
    db: Session,
    user: User,
) -> Evidence:
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    _get_case_for_user(evidence.case_id, db, user)
    return evidence


@router.post("/api/evidence/upload")
async def upload_evidence(
    case_id: int = Form(...),
    evidence_file: UploadFile = File(...),
    metadata_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EXAMINER"])),
):
    case = _get_case_for_user(case_id, db, current_user)

    original_filename = Path(
        evidence_file.filename or "evidence.bin"
    ).name
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Evidence must be MP4, AVI, MKV or MOV",
        )

    if evidence_file.content_type not in ALLOWED_VIDEO_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid evidence MIME type: {evidence_file.content_type}",
        )

    storage_filename = f"{uuid.uuid4().hex}_{original_filename}"
    upload_path = UPLOAD_DIR / storage_filename

    try:
        original_hash, total_size = calculate_sha256_stream(
            upload_path,
            evidence_file,
        )
    except ValueError as exc:
        if upload_path.exists():
            upload_path.unlink()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        if upload_path.exists():
            upload_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Evidence acquisition failed: {exc}",
        )

    sidecar_metadata = {}
    metadata_storage_filename = None

    if metadata_file is not None:
        metadata_filename = Path(
            metadata_file.filename or "metadata.json"
        ).name

        if Path(metadata_filename).suffix.lower() != ".json":
            upload_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail="Metadata file must have a .json extension",
            )

        if metadata_file.content_type not in ALLOWED_JSON_MIME_TYPES:
            upload_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid metadata MIME type: {metadata_file.content_type}",
            )

        metadata_content = await metadata_file.read(MAX_UPLOAD_SIZE + 1)
        if len(metadata_content) > MAX_UPLOAD_SIZE:
            upload_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail="Metadata file exceeds the 500 MB size limit",
            )

        try:
            sidecar_metadata = parse_sidecar_metadata(metadata_content)
        except ValueError as exc:
            upload_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=str(exc))

        metadata_storage_filename = (
            f"{uuid.uuid4().hex}_metadata_{metadata_filename}"
        )
        (UPLOAD_DIR / metadata_storage_filename).write_bytes(metadata_content)

    if not sidecar_metadata:
        sidecar_metadata = {
            "vendor": "Vendor-A",
            "camera_id": Path(original_filename).stem,
            "location": "Unknown",
            "codec": "H.264",
            "clock_offset": 0,
            "source": "MOCK_DVR_EXPORT",
        }

    try:
        video_metadata = extract_video_metadata(upload_path)
    except ValueError as exc:
        upload_path.unlink(missing_ok=True)
        if metadata_storage_filename:
            (UPLOAD_DIR / metadata_storage_filename).unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc))

    oem_profile = identify_oem_profile(sidecar_metadata)

    try:
        clock_offset = float(sidecar_metadata.get("clock_offset", 0.0))
    except (TypeError, ValueError):
        clock_offset = 0.0

    unified_metadata = {
        "evidence": {
            "filename": original_filename,
            "sha256": original_hash,
            "size_bytes": total_size,
        },
        "oem": oem_profile,
        "dvr_metadata": sidecar_metadata,
        "media": video_metadata,
        "temporal": {
            "clock_offset": clock_offset,
        },
        "processing": {
            "metadata_status": "PARSED",
            "engine": "ForensicVision-X Lite",
            "phase": "PHASE_2",
        },
        "storage_filename": storage_filename,
        "metadata_storage_filename": metadata_storage_filename,
    }

    evidence = Evidence(
        case_id=case.id,
        filename=original_filename,
        original_hash=original_hash,
        metadata_json=json.dumps(unified_metadata),
        status="METADATA_PARSED",
        clock_offset=clock_offset,
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    audit = create_audit_log(
        db=db,
        case_id=case.id,
        evidence_id=evidence.id,
        action=(
            f"EVIDENCE_ACQUIRED | SHA-256={original_hash}"
        ),
    )

    metadata_audit = create_audit_log(
        db=db,
        case_id=case.id,
        evidence_id=evidence.id,
        action=(
            f"METADATA_PARSED | SHA-256={original_hash}"
        ),
    )

    return {
        "message": "Evidence acquired and metadata parsed successfully",
        "evidence": {
            "id": evidence.id,
            "case_id": case.id,
            "filename": original_filename,
            "status": evidence.status,
            "sha256": original_hash,
            "clock_offset": clock_offset,
            "oem_profile": oem_profile,
            "metadata": unified_metadata,
        },
        "chain_of_custody": {
            "acquisition_audit_id": audit.id,
            "metadata_audit_id": metadata_audit.id,
            "entry_hash": metadata_audit.entry_hash,
        },
    }


@router.post("/api/evidence/{evidence_id}/normalize")
def normalize_evidence_timestamp(
    evidence_id: int,
    request: NormalizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(["EXAMINER", "REVIEWER", "ADMIN"])
    ),
):
    evidence = _get_evidence_for_user(evidence_id, db, current_user)

    evidence.clock_offset = request.clock_offset_seconds
    db.commit()
    db.refresh(evidence)

    # Keep the normalized value mirrored in unified metadata.
    try:
        metadata = json.loads(evidence.metadata_json or "{}")
        metadata.setdefault("temporal", {})[
            "clock_offset"
        ] = evidence.clock_offset
        evidence.metadata_json = json.dumps(metadata)
        db.commit()
    except json.JSONDecodeError:
        pass

    audit = create_audit_log(
        db=db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        action="TIMELINE_NORMALIZED",
    )

    return {
        "message": "Evidence timestamp normalized successfully",
        "evidence_id": evidence.id,
        "case_id": evidence.case_id,
        "filename": evidence.filename,
        "clock_offset_seconds": evidence.clock_offset,
        "audit": {
            "id": audit.id,
            "action": audit.action,
            "timestamp": audit.timestamp,
            "entry_hash": audit.entry_hash,
        },
    }


@router.post("/api/evidence/{evidence_id}/analyze")
def analyze_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(["EXAMINER", "REVIEWER", "ADMIN"])
    ),
):
    evidence = _get_evidence_for_user(evidence_id, db, current_user)
    video_path = find_evidence_file(evidence)

    if video_path is None:
        raise HTTPException(
            status_code=404,
            detail="Physical evidence file not found",
        )

    try:
        frame, frame_index, frame_count = extract_middle_frame(video_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    use_mock = os.getenv("USE_MOCK_YOLO", "false").lower() == "true"

    try:
        if use_mock:
            detections = get_mock_detections(frame)
            ai_engine = "MOCK_YOLO"
        else:
            detections = run_yolo_detection(frame)
            ai_engine = "YOLOv8n"
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {exc}",
        )

    annotated = annotate_frame(frame, detections)
    output_filename = (
        f"ai_{evidence.id}_{uuid.uuid4().hex[:8]}.jpg"
    )
    output_path = UPLOAD_DIR / output_filename

    if not cv2.imwrite(str(output_path), annotated):
        raise HTTPException(
            status_code=500,
            detail="Failed to save annotated frame",
        )

    triage_results = []

    for detection in detections:
        triage = Triage(
            evidence_id=evidence.id,
            label=detection["label"],
            confidence=detection["confidence"],
            bbox_json=json.dumps(detection["bbox"]),
            annotated_path=output_filename,
            decision="PENDING",
        )
        db.add(triage)
        db.commit()
        db.refresh(triage)

        triage_results.append(
            {
                "triage_id": triage.id,
                "label": triage.label,
                "source_class": detection["source_class"],
                "confidence": triage.confidence,
                "bbox": detection["bbox"],
                "decision": triage.decision,
            }
        )

    create_audit_log(
        db=db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        action=(
            f"AI_ANALYSIS_COMPLETED | SHA-256={evidence.original_hash}"
        ),
    )

    return {
        "message": "AI triage completed",
        "evidence_id": evidence.id,
        "filename": evidence.filename,
        "engine": ai_engine,
        "frame": {
            "frame_index": frame_index,
            "total_frames": frame_count,
        },
        "annotated_frame": {
            "path": f"/api/triage/frame/{output_filename}",
        },
        "detections": triage_results,
    }


@router.get("/api/files/{evidence_id}")
def get_protected_evidence_file(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    evidence = _get_evidence_for_user(evidence_id, db, current_user)
    evidence_path = find_evidence_file(evidence)

    if evidence_path is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence file not found",
        )

    return FileResponse(
        path=evidence_path,
        media_type="application/octet-stream",
        filename=evidence.filename,
    )


@router.post("/api/triage/{triage_id}/decision")
def triage_decision(
    triage_id: int,
    request: TriageDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(["EXAMINER", "REVIEWER", "ADMIN"])
    ),
):
    triage = db.query(Triage).filter(Triage.id == triage_id).first()
    if triage is None:
        raise HTTPException(status_code=404, detail="Triage finding not found")

    evidence = db.query(Evidence).filter(Evidence.id == triage.evidence_id).first()
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    _get_case_for_user(evidence.case_id, db, current_user)

    triage.decision = request.decision
    db.commit()
    db.refresh(triage)

    action = (
        "AI_FINDING_ACCEPTED"
        if triage.decision == "ACCEPT"
        else "AI_FINDING_REJECTED"
    )

    audit = create_audit_log(
        db=db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        action=(
            f"{action} | SHA-256={evidence.original_hash}"
        ),
    )

    return {
        "message": "Triage decision recorded",
        "triage": {
            "id": triage.id,
            "evidence_id": triage.evidence_id,
            "label": triage.label,
            "confidence": triage.confidence,
            "decision": triage.decision,
        },
        "audit": {
            "id": audit.id,
            "action": audit.action,
            "timestamp": audit.timestamp,
            "entry_hash": audit.entry_hash,
        },
    }


@router.get("/api/triage/frame/{filename}")
def get_protected_triage_frame(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Protected compatibility route for annotated frames used by the UI."""
    safe_name = Path(filename).name
    triage = (
        db.query(Triage)
        .filter(Triage.annotated_path == safe_name)
        .order_by(Triage.id.desc())
        .first()
    )

    if triage is None:
        raise HTTPException(status_code=404, detail="Annotated frame not found")

    evidence = db.query(Evidence).filter(Evidence.id == triage.evidence_id).first()
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    _get_case_for_user(evidence.case_id, db, current_user)

    frame_path = UPLOAD_DIR / safe_name
    if not frame_path.exists():
        raise HTTPException(status_code=404, detail="Annotated frame file not found")

    return FileResponse(
        path=frame_path,
        media_type="image/jpeg",
        filename=safe_name,
    )
