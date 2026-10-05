import type {
  AnalyzeResponse,
  AuditResponse,
  CaseRecord,
  LoginResponse,
  TimelineResponse,
  UserInfo,
  VerifyResponse,
} from '../types'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const TOKEN_KEY = 'fvx_access_token'
const USER_KEY = 'fvx_user'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): UserInfo | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as UserInfo } catch { return null }
}

export function saveSession(token: string, user: UserInfo) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (auth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'detail' in payload ? (payload as any).detail : payload
    if (response.status === 401) clearSession()
    throw new Error(detail || `Request failed with ${response.status}`)
  }

  return payload as T
}

function getErrorMessage(payload: unknown, status: number) {
  if (typeof payload === 'object' && payload && 'detail' in payload) {
    return String((payload as Record<string, unknown>).detail || `Upload failed with ${status}`)
  }
  if (typeof payload === 'string' && payload.trim()) return payload
  return `Upload failed with ${status}`
}

export const api = {
  health: () => request<{ project: string; status: string; version: string }>('/', {}, false),

  login: (username: string, password: string) => request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, false),

  createCase: (case_name: string, examiner_name: string) => request<CaseRecord>('/api/cases', {
    method: 'POST',
    body: JSON.stringify({ case_name, examiner_name }),
  }),

  getCase: (caseId: number) => request<CaseRecord>(`/api/cases/${caseId}`),

  uploadEvidence: async (caseId: number, evidenceFile: File, metadataFile?: File | null) => {
    const form = new FormData()
    form.append('case_id', String(caseId))
    form.append('evidence_file', evidenceFile)
    if (metadataFile) form.append('metadata_file', metadataFile)
    return request<any>('/api/evidence/upload', { method: 'POST', body: form })
  },

  uploadEvidenceWithProgress: (
    caseId: number,
    evidenceFile: File,
    metadataFile: File | null,
    onProgress: (progress: number) => void,
  ) => new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('case_id', String(caseId))
    form.append('evidence_file', evidenceFile)
    if (metadataFile) form.append('metadata_file', metadataFile)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }

    xhr.onload = async () => {
      const contentType = xhr.getResponseHeader('content-type') || ''
      let payload: unknown = xhr.responseText
      try {
        if (contentType.includes('application/json')) payload = JSON.parse(xhr.responseText)
      } catch {
        payload = xhr.responseText
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload)
        return
      }

      if (xhr.status === 401) clearSession()
      reject(new Error(getErrorMessage(payload, xhr.status)))
    }

    xhr.onerror = () => reject(new Error('Network error during evidence acquisition.'))
    xhr.onabort = () => reject(new Error('Evidence acquisition was cancelled.'))

    const token = getToken()
    xhr.open('POST', `${API_BASE}/api/evidence/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  }),

  normalize: (evidenceId: number, offset: number) => request<any>(`/api/evidence/${evidenceId}/normalize`, {
    method: 'POST',
    body: JSON.stringify({ clock_offset_seconds: offset }),
  }),

  timeline: (caseId: number) => request<TimelineResponse>(`/api/cases/${caseId}/timeline`),

  analyze: (evidenceId: number) => request<AnalyzeResponse>(`/api/evidence/${evidenceId}/analyze`, {
    method: 'POST',
  }),

  decide: (triageId: number, decision: 'ACCEPT' | 'REJECT') => request<any>(`/api/triage/${triageId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  }),

  audit: (caseId: number) => request<AuditResponse>(`/api/audit/${caseId}`),

  verifyAudit: (caseId: number) => request<VerifyResponse>(`/api/audit/${caseId}/verify`),

  protectedImage: async (path: string) => {
    const token = getToken()
    const response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      if (response.status === 401) clearSession()
      throw new Error(`Unable to load protected frame (${response.status})`)
    }
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  },

  downloadReport: async (caseId: number) => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/api/cases/${caseId}/report`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error(`Unable to generate report (${response.status})`)
    return response.blob()
  },
}
