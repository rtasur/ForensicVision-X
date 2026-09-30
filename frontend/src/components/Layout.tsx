import type { ReactNode } from 'react'
import { Archive, BadgeCheck, ClipboardList, FileCheck2, FileClock, FileSearch, LogOut, ScanSearch, ShieldCheck } from 'lucide-react'
import type { UserInfo } from '../types'

export type TabKey = 'intake' | 'evidence' | 'timeline' | 'triage' | 'provenance'

const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: 'intake', label: 'Case Intake', icon: <ClipboardList size={16} /> },
  { key: 'evidence', label: 'Evidence Analysis', icon: <FileSearch size={16} /> },
  { key: 'timeline', label: 'Forensic Timeline', icon: <FileClock size={16} /> },
  { key: 'triage', label: 'AI Triage', icon: <ScanSearch size={16} /> },
  { key: 'provenance', label: 'Provenance & Report', icon: <FileCheck2 size={16} /> },
]

export function AppShell({ children, activeTab, setActiveTab, user, caseId, setCaseId, onLoadCase, onLogout, backendOk }: { children: ReactNode; activeTab: TabKey; setActiveTab: (tab: TabKey) => void; user: UserInfo; caseId: number | null; setCaseId: (id: number | null) => void; onLoadCase: () => void; onLogout: () => void; backendOk: boolean | null }) {
  return (
    <div className="min-h-screen bg-[#080d16] text-slate-200">
      <aside className="fixed inset-y-0 left-0 w-[246px] border-r border-slate-800 bg-[#0a111c]">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-sky-800 bg-sky-950/30 text-xs font-bold tracking-widest text-sky-300">FVX</div>
              <div>
                <div className="text-sm font-semibold tracking-[0.16em] text-slate-100">FORENSICVISION-X</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-600">Digital Evidence Workbench</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workflows</div>
            <div className="space-y-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.key
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`focus-ring flex w-full items-center gap-3 border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide transition ${active ? 'border-sky-900/70 bg-sky-950/30 text-sky-300' : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200'}`}>
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="border-t border-slate-800 px-4 py-4">
            <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-600">Session</div>
                <div className="mt-1 text-xs font-medium text-slate-200">{user.username}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-sky-400"><BadgeCheck size={12} /> {user.role}</div>
              </div>
              <ShieldCheck size={18} className="text-slate-700" />
            </div>
            <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${backendOk ? 'bg-emerald-400' : backendOk === false ? 'bg-red-400' : 'bg-amber-400'}`} />
              Backend {backendOk ? 'online' : backendOk === false ? 'unreachable' : 'checking'}
            </div>
            <button onClick={onLogout} className="focus-ring flex w-full items-center gap-2 border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-800 hover:text-slate-200"><LogOut size={14} /> Sign out</button>
          </div>
        </div>
      </aside>

      <main className="ml-[246px] min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-[#090f18]/95 backdrop-blur">
          <div className="flex items-center justify-between px-7 py-3.5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-600">SIH26150 / Secure Evidence Processing</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">Controlled forensic review environment</div>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <div className="mb-1 text-right text-[10px] uppercase tracking-wider text-slate-600">Active case</div>
                <div className="flex items-center gap-2">
                  <input value={caseId ?? ''} onChange={(e) => setCaseId(e.target.value ? Number(e.target.value) : null)} className="focus-ring w-24 border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-xs text-slate-200" placeholder="ID" inputMode="numeric" />
                  <button onClick={onLoadCase} disabled={!caseId} className="focus-ring border border-sky-700 bg-sky-950/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sky-300 disabled:cursor-not-allowed disabled:opacity-40">Load</button>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="panel-grid min-h-[calc(100vh-66px)] p-7">{children}</div>
      </main>
    </div>
  )
}
