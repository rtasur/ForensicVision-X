export type Role = 'EXAMINER' | 'REVIEWER' | 'ADMIN' | string

export type UserInfo = {
  id: number
  username: string
  role: Role
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: UserInfo
}

export type Evidence = {
  id: number
  filename: string
  original_hash: string
  status: string
  clock_offset: number
  metadata: Record<string, any>
}

export type CaseRecord = {
  id: number
  case_name: string
  examiner_name: string
  owner_id: number
  created_at: string
  evidence: Evidence[]
}

export type TimelineEvent = {
  evidence_id: number
  filename: string
  camera_id: string
  event_type: string
  original_time: string
  normalized_time: string
  clock_offset_seconds: number
}

export type TimelineResponse = {
  case_id: number
  event_count: number
  timeline: TimelineEvent[]
}

export type Detection = {
  triage_id: number
  label: string
  source_class: string
  confidence: number
  bbox: [number, number, number, number]
  decision: 'PENDING' | 'ACCEPT' | 'REJECT' | string
}

export type AnalyzeResponse = {
  message: string
  evidence_id: number
  filename: string
  engine: string
  frame: {
    frame_index: number
    total_frames: number
  }
  annotated_frame: {
    path: string
  }
  detections: Detection[]
}

export type AuditEntry = {
  id: number
  case_id: number
  evidence_id: number | null
  action: string
  timestamp: string
  entry_hash: string
}

export type AuditResponse = {
  case_id: number
  audit_count: number
  audit_logs: AuditEntry[]
}

export type VerifyResponse = {
  case_id: number
  verified: boolean
  entries_checked?: number
  failed_entry_id?: number
}
