# ForensicVision-X Lite — Phase 6 Frontend

Minimalist, formal dark-mode React/Tailwind operator interface for the secured SIH26150 backend.

## Design direction

- Dark navy/charcoal government-style interface
- Thin borders, restrained blue accents, compact information density
- Monospace SHA-256 hashes and forensic identifiers
- No gradients, no consumer-style cards, no decorative animations
- Protected evidence and report requests carry the JWT from `sessionStorage`

## Backend contract used

- `POST /api/auth/login`
- `POST /api/cases`
- `GET /api/cases/{case_id}`
- `POST /api/evidence/upload`
- `POST /api/evidence/{evidence_id}/normalize`
- `GET /api/cases/{case_id}/timeline`
- `POST /api/evidence/{evidence_id}/analyze`
- `GET /api/triage/frame/{filename}`
- `POST /api/triage/{triage_id}/decision`
- `GET /api/audit/{case_id}`
- `GET /api/audit/{case_id}/verify`
- `GET /api/cases/{case_id}/report`

## Run

From PowerShell in this frontend directory:

```powershell
npm install
copy .env.example .env
npm run dev
```

The development server is deliberately bound to **http://localhost:5173** because the secured backend CORS policy allows that exact origin.

Backend:

```text
http://127.0.0.1:8000
```

Do not browse the frontend as `http://127.0.0.1:5173` unless you also change the backend CORS allowlist.

## Demo login

```text
examiner / demo
reviewer / demo
admin / demo
```

## Workflow

1. Sign in.
2. Create or load a case.
3. Acquire MP4 + optional JSON sidecar.
4. Inspect the evidence table and SHA-256.
5. Normalize camera clocks and review the timeline.
6. Run AI triage and accept/reject findings.
7. Verify the audit chain.
8. Generate the forensic PDF.
