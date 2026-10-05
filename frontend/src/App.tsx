import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Camera, LockKeyhole, ShieldCheck } from 'lucide-react'
import { AppShell, type TabKey } from './components/Layout'
import { AITriage } from './components/AITriage'
import { CaseIntake } from './components/CaseIntake'
import { EvidenceAnalysis } from './components/EvidenceAnalysis'
import { ForensicTimeline } from './components/ForensicTimeline'
import { ProvenanceReport } from './components/ProvenanceReport'
import { SystemBoot } from './components/SystemBoot'
import { Alert, Button, Field } from './components/UI'
import { CameraWall } from './components/CCTV/CameraWall'
import { Typewriter } from './animations/Typewriter'
import type { CaseRecord, UserInfo } from './types'
import { api, clearSession, getStoredUser, getToken, saveSession } from './lib/api'

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(getStoredUser())
  const [booting, setBooting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('intake')
  const [caseId, setCaseId] = useState<number | null>(() => {
    const raw = sessionStorage.getItem('fvx_case_id')
    return raw ? Number(raw) : null
  })
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [caseLoadError, setCaseLoadError] = useState<string | null>(null)

  useEffect(() => {
    api.health().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
  }, [])

  useEffect(() => {
    if (!user || !caseId) return
    void loadCase(caseId).catch(() => undefined)
  }, [user, caseId])

  function persistCase(id: number | null) {
    setCaseId(id)
    if (id) sessionStorage.setItem('fvx_case_id', String(id))
    else sessionStorage.removeItem('fvx_case_id')
  }

  async function loadCase(id = caseId!) {
    setCaseLoadError(null)
    try {
      const record = await api.getCase(id)
      setCaseRecord(record)
      persistCase(record.id)
      return record
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to load Case #${id}.`
      setCaseLoadError(message)
      throw error
    }
  }

  async function handleCaseSelected(id: number) {
    persistCase(id)
    await loadCase(id)
  }

  function logout() {
    clearSession()
    sessionStorage.removeItem('fvx_case_id')
    setUser(null)
    setCaseRecord(null)
    setBooting(false)
    setCaseLoadError(null)
  }

  if (!user || !getToken()) {
    return <LoginScreen backendOk={backendOk} onLogin={(u) => { setUser(u); setBooting(true) }} />
  }

  if (booting) {
    return <SystemBoot onComplete={() => setBooting(false)} />
  }

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      caseId={caseId}
      setCaseId={persistCase}
      onLoadCase={() => { if (caseId) void loadCase(caseId) }}
      onLogout={logout}
      backendOk={backendOk}
      caseLoadError={caseLoadError}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(3px)' }}
          transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'intake' && <CaseIntake caseId={caseId} caseRecord={caseRecord} onCaseCreated={handleCaseSelected} onReload={() => caseId ? loadCase(caseId).then(() => undefined) : Promise.resolve()} />}
          {activeTab === 'evidence' && <EvidenceAnalysis caseRecord={caseRecord} onRefresh={() => caseId ? loadCase(caseId).then(() => undefined) : Promise.resolve()} />}
          {activeTab === 'timeline' && <ForensicTimeline caseRecord={caseRecord} />}
          {activeTab === 'triage' && <AITriage caseRecord={caseRecord} />}
          {activeTab === 'provenance' && <ProvenanceReport caseRecord={caseRecord} />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}

function LoginScreen({ backendOk, onLogin }: { backendOk: boolean | null; onLogin: (user: UserInfo) => void }) {
  const [username, setUsername] = useState('examiner')
  const [password, setPassword] = useState('demo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.login(username.trim(), password)
      saveSession(result.access_token, result.user)
      onLogin(result.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-fvx-paper text-fvx-navy">
      <div className="absolute inset-0 ambient-cctv" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1540px] items-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid w-full overflow-hidden border-2 border-fvx-navy/12 bg-fvx-white shadow-[10px_10px_0_#0b263a] xl:grid-cols-[1.15fr_.85fr]">
          <section className="relative overflow-hidden border-b-2 border-fvx-navy/10 p-6 sm:p-8 xl:border-b-0 xl:border-r-2 xl:p-10">
            <div className="absolute right-0 top-0 h-full w-1 bg-fvx-teal" />

            <div className="flex flex-col gap-4 border-b-2 border-fvx-navy/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-28 items-center justify-center bg-white">
                  <img src="/fvx-logo.png" alt="ForensicVision-X" className="h-full w-full object-contain" />
                </div>
                <div>
                  <div className="text-base font-black uppercase tracking-[0.08em] text-fvx-navy">ForensicVision-X</div>
                  <div className="mt-2 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-fvx-navy/50">Digital Evidence Laboratory</div>
                  <div className="mt-1 font-mono text-[8px] text-fvx-navy/55">SIH 26150 / CCTV FORENSICS</div>
                </div>
              </div>

              <div className="inline-flex w-fit items-center gap-2 border-2 border-fvx-green/40 bg-[#EFF8F3] px-3 py-2 font-mono text-[8px] font-black uppercase text-fvx-green">
                <ShieldCheck size={12} /> Secure workstation
              </div>
            </div>

            <div className="mt-10 max-w-3xl">
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-fvx-teal">Controlled forensic environment</div>
              <h1 className="mt-4 max-w-2xl text-5xl font-black leading-[0.92] tracking-[-0.045em] text-fvx-navy xl:text-6xl">
                CCTV evidence.
                <br />
                <span className="text-fvx-teal">Under analysis.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-fvx-navy/55">
                Acquire, verify, synchronize, triage and report digital video evidence through a controlled forensic workflow.
              </p>
            </div>

            <div className="mt-10">
              <div className="mb-3 flex items-center gap-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-fvx-navy/50">
                <Camera size={12} /> Camera matrix
              </div>
              <CameraWall />
            </div>

            <div className="mt-8 border-l-4 border-fvx-orange bg-[#F8F5EC] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fvx-navy/55">
              <Typewriter text="CONTROLLED CCTV EVIDENCE PROCESSING" speed={22} />
            </div>
          </section>

          <section className="relative bg-fvx-paper p-6 sm:p-8 xl:p-10">
            <div className="absolute inset-0 ambient-grid opacity-15" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.06em]">Operator sign-in</div>
                  <div className="mt-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-fvx-navy/45">Authorized access required</div>
                </div>
                <div className={`border-2 px-2.5 py-1.5 font-mono text-[8px] font-black uppercase ${backendOk ? 'border-fvx-green/40 bg-[#EFF8F3] text-fvx-green' : backendOk === false ? 'border-fvx-red/40 bg-[#FFF1EE] text-fvx-red' : 'border-fvx-navy/10 bg-fvx-white text-fvx-navy/50'}`}>
                  {backendOk ? 'API ONLINE' : backendOk === false ? 'API OFFLINE' : 'CHECKING'}
                </div>
              </div>

              {error && <div className="mt-6"><Alert message={error} /></div>}

              <form onSubmit={submit} className="mt-10 space-y-5">
                <Field label="Username">
                  <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="focus-ring w-full border-2 border-fvx-navy/15 bg-fvx-white px-4 py-3 text-sm font-bold text-fvx-navy" />
                </Field>
                <Field label="Password">
                  <input autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="focus-ring w-full border-2 border-fvx-navy/15 bg-fvx-white px-4 py-3 font-mono text-sm font-bold text-fvx-navy" />
                </Field>
                <Button loading={loading} type="submit" className="mt-3 min-h-12 w-full">
                  <LockKeyhole size={15} /> Authenticate operator
                </Button>
              </form>

              <div className="mt-8 border-t border-fvx-navy/10 pt-5">
                <div className="font-mono text-[8px] font-black uppercase tracking-[0.14em] text-fvx-navy/45">Demonstration accounts</div>
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px]">
                  <div className="border border-fvx-navy/10 bg-fvx-white p-3">EXAMINER<br /><span className="text-fvx-navy/40">demo</span></div>
                  <div className="border border-fvx-navy/10 bg-fvx-white p-3">REVIEWER<br /><span className="text-fvx-navy/40">demo</span></div>
                  <div className="border border-fvx-navy/10 bg-fvx-white p-3">ADMIN<br /><span className="text-fvx-navy/40">demo</span></div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 border-y border-fvx-navy/10 py-4 font-mono text-[8px] uppercase tracking-[0.1em] text-fvx-navy/45">
                <div>JWT + RBAC</div>
                <div>PROTECTED EVIDENCE</div>
                <div className="mt-3">SHA-256 INTEGRITY</div>
                <div className="mt-3">AUDIT CHAIN</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
