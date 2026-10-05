# ForensicVision-X Lite

### SIH26150 — Multi-Vendor DVR/NVR Forensic Analysis Tool

**YOKAI ForensicVision-X Lite** is a forensic workflow prototype designed to turn heterogeneous CCTV/DVR evidence into a single, traceable examination workflow.

The project focuses on the forensic problems created by vendor-specific recorder formats, inconsistent metadata, recorder clock drift, manual evidence handling, and the need to review AI findings without allowing automation to make the final examiner decision.

> **Prototype scope:** This implementation uses a controlled MP4 + JSON sidecar representation to mock proprietary DVR/NVR exports. The architecture is intentionally adapter-oriented so vendor-specific parsers can be added without redesigning the core workflow.

---

## 1. Problem We Address

CCTV evidence is rarely uniform. Different DVR/NVR vendors and firmware versions can expose different storage structures, metadata fields, playback mechanisms, timestamp conventions, and export formats.

This creates several forensic difficulties:

- Vendor-specific evidence formats and codecs
- Metadata inconsistency between recorder systems
- Recorder timestamp / clock drift
- Multiple tools required for different OEM ecosystems
- Manual evidence handoffs and weak provenance
- Difficult correlation of recordings from multiple cameras
- Large volumes of CCTV footage that require triage
- Risk of treating AI output as a conclusion instead of an examiner-reviewed candidate

ForensicVision-X Lite addresses these challenges with one evidence-processing workflow.

---

## 2. What the System Does

The application follows a forensic evidence lifecycle:

```text
IDENTIFY
   ↓
ACQUIRE
   ↓
HASH
   ↓
PARSE
   ↓
NORMALIZE
   ↓
TRIAGE
   ↓
HUMAN REVIEW
   ↓
PROVENANCE
   ↓
REPORT
```

Every major processing stage is designed to remain traceable to the original evidence object.

---

## 3. Core Workflow

### 01 — Case Intake

The examiner creates an investigation and records the authenticated examiner identity.

The evidence acquisition interface supports:

- CCTV video selection
- Optional JSON sidecar metadata
- Local MP4 preview before acquisition
- Evidence acquisition progress
- SHA-256 integrity processing
- OEM metadata extraction
- Evidence registration

The interface deliberately presents acquisition as a forensic workflow instead of a generic file-upload form.

---

### 02 — Evidence Analysis

Each evidence object is represented through a unified evidence model.

The analysis view exposes:

- Evidence ID
- Original filename
- SHA-256 hash
- Vendor / OEM profile
- Camera ID
- Camera location
- Codec
- FPS
- Resolution
- Frame count
- Duration
- Recorder clock offset
- Processing status

Evidence records can be expanded so the examiner can inspect the forensic metadata without leaving the register.

---

### 03 — Forensic Timeline

CCTV recorders may not agree on time.

ForensicVision-X keeps both timestamps visible:

```text
ORIGINAL TIME
      ↓
CLOCK OFFSET
      ↓
NORMALIZED TIME
```

The examiner can apply a clock correction and view the original and normalized times together.

The timeline interface uses scroll-driven narrative behavior so the active event, temporal relationship, and spatial representation change as the examiner moves through the evidence sequence.

---

### 04 — AI-Assisted Triage

The prototype uses **YOLOv8-nano** for evidence triage.

The model is used to identify candidate objects such as:

- Person
- Vehicle

The system extracts a representative frame and displays detections using forensic CCTV overlays.

Each finding exposes:

- Detection class
- Source class
- Confidence
- Bounding box
- Review state

The examiner can move through findings using **Previous / Next** controls.

### Human-in-the-loop principle

AI output is a **candidate finding**, not a final forensic conclusion.

The examiner explicitly chooses:

```text
ACCEPT
or
REJECT
```

This preserves examiner control over the final interpretation.

---

### 05 — Provenance & Report

The provenance view presents the processing history as a chronological chain:

```text
CASE CREATED
      ↓
EVIDENCE ACQUIRED
      ↓
SHA-256 REGISTERED
      ↓
METADATA PARSED
      ↓
TIMELINE NORMALIZED
      ↓
AI FINDING RECORDED
      ↓
EXAMINER DECISION
      ↓
REPORT ISSUED
```

Audit records are displayed with their associated forensic information and integrity state.

The examiner can verify the audit chain and generate a standardized PDF forensic report containing case information, evidence details, hashes, temporal corrections, accepted AI findings, and audit history.

---

## 4. Architecture

```text
                    ┌───────────────────────┐
                    │      React UI         │
                    │  Vite + TypeScript    │
                    │  Tailwind + Motion    │
                    └───────────┬───────────┘
                                │ REST API
                                ▼
                    ┌───────────────────────┐
                    │       FastAPI         │
                    │ Authentication / API  │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ Evidence     │  │ AI Triage    │  │ Provenance   │
      │ Engine       │  │ YOLOv8-nano  │  │ Audit Chain  │
      └──────┬───────┘  └──────────────┘  └──────┬───────┘
             │                                   │
             ├──────────────┐                    │
             ▼              ▼                    ▼
       OpenCV Media     OEM Metadata        SHA-256 / Logs
             │              │                    │
             └──────────────┴────────────┬───────┘
                                         ▼
                              ┌────────────────────┐
                              │    PostgreSQL      │
                              │ Cases / Evidence   │
                              │ Audit / Triage     │
                              └────────────────────┘
```

---

## 5. Technology Stack

### Backend

- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL
- OpenCV
- Ultralytics YOLOv8-nano
- SHA-256 hashing
- JWT authentication
- bcrypt password hashing
- PDF report generation

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Motion for React
- Lucide Icons

### Deployment

- Docker
- Docker Compose
- PostgreSQL container
- FastAPI backend container
- Vite build served through nginx

---

## 6. Security & Evidence Integrity

The prototype includes security controls appropriate for the demonstration workflow:

### Authentication

JWT-based authentication is used to identify the active examiner.

### Role-based access

Protected operations can be restricted according to examiner role.

### Case ownership / authorization

Case access is checked against the authenticated owner where applicable to prevent direct object-level authorization failures.

### Password security

Passwords are hashed using bcrypt rather than stored as plaintext.

### Evidence integrity

Evidence is hashed using SHA-256 during acquisition.

The original hash is retained with the evidence record so later processing can be linked back to the acquired object.

### Auditability

Major processing actions are written to the audit trail, creating a chronological evidence-handling history.

### Protected evidence access

Evidence files are not treated as unrestricted public assets; protected routes are used for forensic media access.

### Upload hardening

The acquisition workflow applies file validation and upload constraints to reduce unsafe input handling.

---

## 7. OEM / Vendor-Agnostic Design

The prototype uses a controlled mock OEM representation:

```text
CCTV.mp4
CCTV.json
```

The JSON sidecar represents recorder-specific metadata that a real DVR/NVR adapter would extract.

Example conceptual flow:

```text
Vendor A Export
       ↓
Vendor A Adapter
       ↓
Unified Evidence Model
       ↓
Common Forensic Workflow
```

The objective is not to claim support for every commercial recorder in the prototype. The objective is to demonstrate an architecture in which new vendor adapters can be added without rewriting the core evidence workflow.

---

## 8. Temporal Normalization

A recorder may have a clock offset relative to another source.

ForensicVision-X stores the correction while retaining the original time.

Example:

```text
Original recorder time : 10:41:10
Clock correction       : +18 sec
Normalized time        : 10:41:28
```

Keeping both values preserves transparency: the examiner can see what the source reported and what normalized analytical time was derived from it.

---

## 9. AI Triage Design

The AI component is intentionally positioned as an **assistance mechanism**.

The workflow is:

```text
CCTV frame
   ↓
YOLO inference
   ↓
Candidate detections
   ↓
Examiner review
   ↓
ACCEPT / REJECT
```

The prototype does not silently convert a model detection into a forensic conclusion.

This separation between automated candidate generation and examiner disposition is a central design principle of the system.

---

## 10. User Interface Design

The frontend is designed as a **digital forensic workstation**, not a conventional SaaS dashboard.

### Visual language

- Warm ivory workspace
- Pale CCTV / sage surfaces
- Muted teal telemetry
- Deep navy structural accents
- Orange examiner-action highlights
- Minimal red used for recording / warnings
- Monospaced forensic metadata
- High-contrast structural borders

### CCTV system

The CCTV interface uses state-driven display rather than pretending every camera is permanently recording.

Typical states include:

```text
STANDBY
SOURCE SELECTED
ACQUIRING
VERIFIED
PLAYBACK
ANALYZED
```

### Motion system

Motion is used to communicate system state rather than decorate the interface.

Examples:

```text
Moving grid       → surveillance environment
Scanline          → CCTV presentation
Upload progress   → evidence acquisition
Finding reveal    → AI review
Timeline movement → temporal correlation
Chain reveal      → provenance processing
Verification      → integrity state
```

---

## 11. Procedural Ambient Background

The application includes a lightweight procedural ambient background instead of using a looping video file.

The background is layered as:

```text
Warm ivory base
      ↓
Soft sage / teal gradient fields
      ↓
Slow gradient movement
      ↓
Low-opacity haze
      ↓
Surveillance sweep
      ↓
Moving CCTV grid
      ↓
Interface content
```

The animation is intentionally slow and subtle so the interface remains readable while still feeling active.

The system also retains reduced-motion handling for accessibility.

---

## 12. Spatial Forensic View

The timeline can be followed by a spatial evidence visualization.

The current prototype treats this as an **illustrative spatial projection**, not calibrated 3D camera geometry.

Its purpose is to show relationships between events/cameras and demonstrate a path toward future spatial forensic analysis.

---

## 13. Forensic Report Contents

Generated reports can contain:

- Case information
- Evidence inventory
- Evidence hashes
- Vendor / camera information
- Media metadata
- Clock offsets
- Accepted AI findings
- Audit history
- Chain-of-custody information

The report is intended to provide a standardized output from the evidence workflow rather than simply exporting a screenshot of the dashboard.

---

## 14. Project Structure

A simplified project structure is:

```text
SIH26150/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── ...
│   ├── tests/
│   ├── uploads/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── animations/
│   │   ├── components/
│   │   │   ├── CCTV/
│   │   │   ├── Forensic3D/
│   │   │   └── ...
│   │   ├── pages/
│   │   └── ...
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── START.cmd
├── STOP.cmd
└── README.md
```

---

## 15. Running the Project

### Local development

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Start FastAPI using the project's existing start command or Uvicorn configuration.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

### Docker

From the project root:

```powershell
docker compose up -d --build
```

Stop:

```powershell
docker compose down
```

---

## 16. Demonstration Script for Judges

A recommended live demonstration is:

### Step 1 — Create a case

Create a case and show the authenticated examiner identity.

### Step 2 — Acquire CCTV evidence

Select an MP4 and optional JSON sidecar.

Show:

```text
Evidence selected
→ Local playback
→ Acquisition
→ SHA-256
→ Metadata parsed
→ Evidence registered
```

### Step 3 — Inspect evidence

Open the Evidence Analysis screen and expand the evidence record.

Point out:

- OEM profile
- Camera identity
- Media metadata
- Clock offset
- SHA-256

### Step 4 — Normalize time

Move the timeline clock correction and show the same event in original and normalized time.

### Step 5 — AI triage

Run YOLO analysis on the evidence frame.

Navigate through findings and show that the examiner explicitly accepts or rejects candidate detections.

### Step 6 — Verify provenance

Open the provenance screen, verify the audit chain, and explain how processing actions remain traceable.

### Step 7 — Generate the forensic report

Generate the PDF and show that the report consolidates the case, evidence, findings, temporal correction and audit trail.

---

## 17. Innovation & Uniqueness

The prototype combines several ideas into one forensic workflow:

### 1. OEM adapter architecture

Vendor-specific metadata and export representations can be translated into a common evidence model.

### 2. Evidence provenance

The workflow links findings back to acquired evidence through hashes and audit records.

### 3. Temporal correlation

Original and normalized timestamps are retained side-by-side.

### 4. Human-in-the-loop AI

AI identifies candidates; the examiner controls disposition.

### 5. Unified workflow

Acquisition, parsing, normalization, triage, provenance and reporting are presented in one environment instead of separate tools.

---

## 18. Current Prototype Boundaries

This is a hackathon prototype and intentionally does not claim full commercial DVR/NVR compatibility.

The current demonstration represents proprietary recorder exports through MP4 + JSON sidecars.

The spatial visualization is illustrative rather than calibrated CCTV geometry.

YOLOv8-nano is used for lightweight object triage, not identity recognition or evidentiary attribution.

These boundaries are deliberate so the prototype can demonstrate the forensic architecture and workflow within the SIH development scope.

---

## 19. Future Scope

The architecture can be extended toward:

- Real OEM DVR/NVR parsers and adapters
- Additional vendor profiles
- Deleted / damaged media recovery modules
- Multi-camera temporal correlation
- Stronger media validation
- Evidence packaging and export standards
- More advanced forensic object analytics
- Camera calibration and true spatial reconstruction
- GPU-accelerated analysis
- Institutional deployment with centralized identity and key management

---

## 20. Why This Matters

The central idea of ForensicVision-X Lite is not simply to "analyze CCTV with AI."

It is to create a **traceable forensic workflow** in which:

```text
SOURCE
  ↓
INTEGRITY
  ↓
CONTEXT
  ↓
TIME
  ↓
ANALYSIS
  ↓
HUMAN DECISION
  ↓
PROVENANCE
  ↓
REPORT
```

Every analytical result should remain connected to where it came from, how it was processed, when it was normalized, and who made the final review decision.

---

## 21. Team / Competition Context

**Smart India Hackathon 2026**  
**Problem Statement:** SIH26150  
**Domain:** Cybersecurity / Digital Forensics / Digital Trust  
**Project:** ForensicVision-X Lite (YOKAI)

---

## 22. License / Usage

This repository is a competition prototype. Check the repository owner/team instructions before redistribution or commercial use.

---

## Quick Judge Pitch

> **ForensicVision-X Lite turns heterogeneous CCTV/DVR exports into one traceable forensic workflow. It acquires and hashes evidence, normalizes recorder time, converts vendor-specific metadata into a common evidence model, uses AI for candidate triage, keeps the examiner in control, maintains provenance throughout processing, and produces a standardized forensic report.**
