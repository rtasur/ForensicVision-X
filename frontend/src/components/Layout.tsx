import { useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  ClipboardList,
  FileCheck2,
  FileClock,
  FileSearch,
  LogOut,
  Menu,
  ScanSearch,
  ShieldCheck,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import type { UserInfo } from '../types'
import { AmbientGrid } from '../animations/AmbientGrid'
import { SystemTicker } from '../animations/SystemTicker'
import { Telemetry } from '../animations/Telemetry'
import { Alert, Button } from './UI'

export type TabKey = 'intake' | 'evidence' | 'timeline' | 'triage' | 'provenance'

const tabs: Array<{ key: TabKey; label: string; number: string; icon: ReactNode }> = [
  { key: 'intake', label: 'Case Intake', number: '01', icon: <ClipboardList size={16} /> },
  { key: 'evidence', label: 'Evidence Analysis', number: '02', icon: <FileSearch size={16} /> },
  { key: 'timeline', label: 'Forensic Timeline', number: '03', icon: <FileClock size={16} /> },
  { key: 'triage', label: 'AI Triage', number: '04', icon: <ScanSearch size={16} /> },
  { key: 'provenance', label: 'Provenance & Report', number: '05', icon: <FileCheck2 size={16} /> },
]

export function AppShell({
  children,
  activeTab,
  setActiveTab,
  user,
  caseId,
  setCaseId,
  onLoadCase,
  onLogout,
  backendOk,
  caseLoadError,
}: {
  children: ReactNode
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  user: UserInfo
  caseId: number | null
  setCaseId: (id: number | null) => void
  onLoadCase: () => void
  onLogout: () => void
  backendOk: boolean | null
  caseLoadError?: string | null
}) {
  const [navOpen, setNavOpen] = useState(false)

  function chooseTab(tab: TabKey) {
    setActiveTab(tab)
    setNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-fvx-paper text-fvx-navy">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setNavOpen(true)}
        className="focus-ring fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center border-2 border-fvx-navy/12 bg-fvx-white text-fvx-navy shadow-[3px_3px_0_#0B263A] lg:hidden"
      >
        <Menu size={18} />
      </button>

      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-fvx-navy/20 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[270px] border-r-2 border-fvx-navy/10 bg-fvx-white transition-transform duration-500 lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b-2 border-fvx-navy/10 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-[60px] w-[82px] shrink-0 items-center justify-center overflow-hidden bg-white">
                <img src="/fvx-logo.png" alt="ForensicVision-X" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-black uppercase leading-tight tracking-[0.08em] text-fvx-navy">ForensicVision-X</div>
                <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-fvx-navy/50">Digital Evidence Laboratory</div>
                <div className="mt-1 font-mono text-[9px] text-fvx-navy/50">SIH / 26150 · CCTV</div>
              </div>
            </div>
            <button type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} className="focus-ring mt-1 p-1 text-fvx-navy/50 lg:hidden"><X size={17} /></button>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-fvx-navy/50">Investigation Workflow</div>
            <div className="space-y-2">
              {tabs.map((tab) => {
                const active = activeTab === tab.key
                return (
                  <motion.button
                    key={tab.key}
                    type="button"
                    whileHover={{ x: active ? 0 : 2 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => chooseTab(tab.key)}
                    className={`focus-ring group flex w-full items-stretch border-2 text-left transition ${active ? 'border-fvx-navy bg-fvx-navy text-white shadow-[4px_4px_0_#E65A33]' : 'border-fvx-navy/12 bg-fvx-white text-fvx-navy/60 hover:border-fvx-teal/40 hover:bg-fvx-cctv hover:text-fvx-navy'}`}
                  >
                    <div className={`flex w-10 shrink-0 items-center justify-center border-r-2 font-mono text-[10px] font-bold ${active ? 'border-fvx-white/15 bg-fvx-navy text-fvx-tealLight' : 'border-fvx-navy/10 text-fvx-navy/45'}`}>{tab.number}</div>
                    <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
                      {tab.icon}
                      <span className="text-[11px] font-black uppercase tracking-[0.04em]">{tab.label}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </nav>

          <div className="border-t-2 border-fvx-navy/10 px-4 py-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-fvx-navy/50">Active operator</div>
                <div className="mt-2 font-mono text-xs font-bold text-fvx-navy">{user.username}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-fvx-teal"><BadgeCheck size={12} />{user.role}</div>
              </div>
              <ShieldCheck size={20} className="text-fvx-teal" />
            </div>

            <div className="mb-4 flex items-center gap-2 border-t border-fvx-navy/10 pt-3">
              <span className={`h-2 w-2 ${backendOk ? 'bg-fvx-green' : backendOk === false ? 'bg-fvx-red' : 'bg-amber-500'}`} />
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-fvx-navy/50">Backend: {backendOk ? 'Online' : backendOk === false ? 'Unreachable' : 'Checking'}</span>
            </div>

            <div className="mb-4 border-2 border-fvx-teal/30 bg-fvx-cctv p-3">
              <div className="mb-2 font-mono text-[8px] font-black uppercase tracking-[0.12em] text-fvx-teal">System monitor</div>
              <Telemetry camera="SYS-01" status={backendOk ? 'ONLINE' : 'CHECKING'} mode="FORENSIC" />
            </div>

            <button onClick={onLogout} className="focus-ring flex w-full items-center justify-center gap-2 border-2 border-fvx-navy/12 bg-fvx-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-fvx-navy/60 transition hover:bg-fvx-paper hover:text-fvx-navy">
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[270px]">
        <header className="sticky top-0 z-30 border-b-2 border-fvx-navy/10 bg-fvx-paper/96 backdrop-blur">
          <div className="flex min-h-[82px] items-center justify-between gap-4 px-5 pl-[68px] sm:px-8 sm:pl-[68px] lg:pl-8">
            <div className="min-w-0">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-fvx-navy/50">Government Digital Forensics Workbench</div>
              <div className="mt-1 truncate text-base font-black text-fvx-navy">Controlled Evidence Processing Environment</div>
            </div>

            <div className="flex items-end gap-4">
              <div className="hidden xl:block"><Telemetry camera="SYS-01" status={backendOk ? 'ONLINE' : 'CHECKING'} mode="AUDIT" /></div>
              <div className="hidden h-10 w-px bg-fvx-navy/10 xl:block" />
              <div>
                <div className="mb-1 hidden text-right text-[9px] font-bold uppercase tracking-[0.14em] text-fvx-navy/50 sm:block">Active case</div>
                <div className="flex items-center gap-2">
                  <input value={caseId ?? ''} onChange={(e) => setCaseId(e.target.value ? Number(e.target.value) : null)} className="focus-ring w-20 border-2 border-fvx-navy/12 bg-fvx-white px-2.5 py-2 font-mono text-xs font-bold text-fvx-navy" placeholder="ID" inputMode="numeric" aria-label="Active case ID" />
                  <Button onClick={onLoadCase} disabled={!caseId} className="px-3 sm:px-4">Load</Button>
                </div>
              </div>
            </div>
          </div>
          <SystemTicker text="CCTV FORENSIC CHANNEL // EVIDENCE INTEGRITY MONITORED // AI OUTPUT REQUIRES HUMAN DISPOSITION // AUDIT CHAIN ACTIVE" />
        </header>

        <div className="ambient-cctv relative isolate min-h-[calc(100vh-118px)] p-4 sm:p-6 lg:p-8">
          <AmbientGrid />
          <div className="relative z-10 space-y-4">
            {caseLoadError && <Alert message={caseLoadError} type="error" />}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
