import { useEffect, useState, type FormEvent } from 'react'
import { LockKeyhole, ServerCog, ShieldCheck } from 'lucide-react'
import { AppShell, type TabKey } from './components/Layout'
import { AITriage } from './components/AITriage'
import { CaseIntake } from './components/CaseIntake'
import { EvidenceAnalysis } from './components/EvidenceAnalysis'
import { ForensicTimeline } from './components/ForensicTimeline'
import { ProvenanceReport } from './components/ProvenanceReport'
import { Alert, Button, Field } from './components/UI'
import type { CaseRecord, UserInfo } from './types'
import { api, clearSession, getStoredUser, getToken, saveSession } from './lib/api'

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(getStoredUser())
  const [activeTab, setActiveTab] = useState<TabKey>('intake')
  const [caseId, setCaseId] = useState<number | null>(() => {
    const raw = sessionStorage.getItem('fvx_case_id')
    return raw ? Number(raw) : null
  })
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  useEffect(() => {
    api.health().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
  }, [])

  useEffect(() => {
    if (!user || !caseId) return
    loadCase(caseId).catch(() => undefined)
  }, [user, caseId])

  function onCaseSelected(id: number | null) {
    setCaseId(id)
    if (id) sessionStorage.setItem('fvx_case_id', String(id))
    else sessionStorage.removeItem('fvx_case_id')
  }

  async function loadCase(id = caseId!) {
    const record = await api.getCase(id)
    setCaseRecord(record)
    onCaseSelected(record.id)
  }

  function logout() {
    clearSession()
    sessionStorage.removeItem('fvx_case_id')
    setUser(null)
    setCaseRecord(null)
  }

  if (!user || !getToken()) {
    return <LoginScreen backendOk={backendOk} onLogin={(u) => setUser(u)} />
  }

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab} user={user} caseId={caseId} setCaseId={onCaseSelected} onLoadCase={() => { if (caseId) loadCase(caseId).catch(() => undefined) }} onLogout={logout} backendOk={backendOk}>
      {activeTab === 'intake' && <CaseIntake caseId={caseId} onCaseCreated={onCaseSelected} onReload={() => caseId ? loadCase(caseId).then(() => undefined) : Promise.resolve()} />}
      {activeTab === 'evidence' && <EvidenceAnalysis caseRecord={caseRecord} onRefresh={() => caseId ? loadCase(caseId).then(() => undefined) : Promise.resolve()} />}
      {activeTab === 'timeline' && <ForensicTimeline caseRecord={caseRecord} />}
      {activeTab === 'triage' && <AITriage caseRecord={caseRecord} />}
      {activeTab === 'provenance' && <ProvenanceReport caseRecord={caseRecord} />}
    </AppShell>
  )
}

function LoginScreen({ backendOk, onLogin }: { backendOk: boolean | null; onLogin: (user: UserInfo) => void }) {
  const [username, setUsername] = useState('examiner')
  const [password, setPassword] = useState('demo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null)
    try {
      const result = await api.login(username.trim(), password)
      saveSession(result.access_token, result.user)
      onLogin(result.user)
    } catch (err) { setError(err instanceof Error ? err.message : 'Authentication failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#080d16] text-slate-200 panel-grid">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-4xl overflow-hidden border border-slate-800 bg-[#0a111c] shadow-panel lg:grid-cols-[1.05fr_.95fr]">
          <div className="border-b border-slate-800 p-9 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center border border-sky-800 bg-sky-950/30 text-xs font-bold tracking-widest text-sky-300">FVX</div><div><div className="text-sm font-semibold tracking-[0.16em] text-slate-100">FORENSICVISION-X</div><div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-slate-600">Lite / SIH26150</div></div></div>
            <div className="mt-16 max-w-lg"><div className="text-[10px] uppercase tracking-[0.28em] text-slate-600">Digital Evidence Workbench</div><h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-100">Controlled CCTV forensic review.</h1><p className="mt-4 text-sm leading-6 text-slate-500">Case intake, evidence integrity, time normalization, AI-assisted triage, and chain-of-custody reporting in one secured operator interface.</p></div>
            <div className="mt-12 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-wider text-slate-500"><div className="border border-slate-800 bg-slate-950/40 p-3"><ShieldCheck size={16} className="text-slate-600" /><div className="mt-2">JWT + RBAC</div></div><div className="border border-slate-800 bg-slate-950/40 p-3"><ServerCog size={16} className="text-slate-600" /><div className="mt-2">Protected evidence</div></div></div>
          </div>

          <div className="p-9">
            <div className="mb-7 flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-slate-200">Operator sign-in</div><div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-600">Authorized access required</div></div><div className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] ${backendOk ? 'border-emerald-900/70 bg-emerald-950/30 text-emerald-300' : backendOk === false ? 'border-red-900/70 bg-red-950/30 text-red-300' : 'border-slate-800 bg-slate-950 text-slate-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{backendOk ? 'API ONLINE' : backendOk === false ? 'API OFFLINE' : 'CHECKING'}</div></div>
            {error && <div className="mb-4"><Alert message={error} /></div>}
            <form onSubmit={submit} className="space-y-4"><Field label="Username"><input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="focus-ring w-full border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200" /></Field><Field label="Password"><input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="focus-ring w-full border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-slate-200" /></Field><Button loading={loading} type="submit" className="mt-2 w-full"><LockKeyhole size={15} /> Authenticate</Button></form>
            <div className="mt-6 border-t border-slate-800 pt-4 text-[10px] leading-5 text-slate-600">Demo operator accounts: <span className="font-mono text-slate-500">examiner / demo</span>, <span className="font-mono text-slate-500">reviewer / demo</span>, <span className="font-mono text-slate-500">admin / demo</span>.</div>
            <div className="mt-4 text-center text-[9px] uppercase tracking-[0.18em] text-slate-700">Access is monitored and audit logged</div>
          </div>
        </div>
      </div>
    </div>
  )
}
