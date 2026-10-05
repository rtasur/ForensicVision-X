import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Fingerprint, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { AuditEntry, AuditResponse, CaseRecord, VerifyResponse } from '../types'
import { Reveal } from '../animations/Reveal'
import { api } from '../lib/api'
import { Alert, Button, IntegritySeal, Panel } from './UI'

type Message = { text: string; type: 'error' | 'success' | 'info' }
type ReportState = 'idle' | 'generating' | 'complete' | 'error'

export function ProvenanceReport({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const [audit, setAudit] = useState<AuditResponse | null>(null)
  const [verify, setVerify] = useState<VerifyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportState, setReportState] = useState<ReportState>('idle')
  const [message, setMessage] = useState<Message | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!caseRecord) return
    void refresh()
  }, [caseRecord?.id])

  async function refresh() {
    if (!caseRecord) return
    setLoading(true)
    setMessage(null)
    try {
      const [a, v] = await Promise.all([api.audit(caseRecord.id), api.verifyAudit(caseRecord.id)])
      setAudit(a)
      setVerify(v)
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to load provenance.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function generateReport() {
    if (!caseRecord) return
    setReportState('generating')
    setMessage(null)
    try {
      const blob = await api.downloadReport(caseRecord.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `forensic_report_case_${caseRecord.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setReportState('complete')
      setMessage({ text: `Forensic report generated for Case ${caseRecord.id}.`, type: 'success' })
    } catch (error) {
      setReportState('error')
      setMessage({ text: error instanceof Error ? error.message : 'Unable to generate report.', type: 'error' })
    }
  }

  if (!caseRecord) return <div className="mx-auto max-w-7xl border-2 border-dashed border-fvx-navy/12 bg-fvx-white px-5 py-16 text-center text-xs text-fvx-navy/55">Load an active case to inspect provenance and generate the report.</div>

  const auditCount = audit?.audit_count ?? 0
  const checked = verify?.entries_checked ?? auditCount

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-fvx-navy/10 pb-5">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fvx-teal">05 / Provenance / chain of custody</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-fvx-navy">Provenance & Report</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-fvx-navy/55">Follow the evidence handoff from acquisition through examiner activity, verify the audit chain, and issue the standardized report.</p>
          </div>
          <IntegritySeal verified={verify?.verified ?? null} />
        </div>
      </Reveal>

      {message && <Alert message={message.text} type={message.type} />}

      <Reveal delay={0.08}>
        <div className="grid gap-3 md:grid-cols-3">
          <Summary label="Audit events" value={String(auditCount).padStart(2, '0')} sub="chronological records" />
          <Summary label="Entries checked" value={String(checked).padStart(2, '0')} sub={verify ? (verify.verified ? 'integrity verified' : 'verification failure') : 'verification pending'} tone={verify?.verified ? 'green' : verify ? 'red' : undefined} />
          <Summary label="Report" value={reportState === 'complete' ? 'ISSUED' : reportState === 'generating' ? 'GENERATING' : 'READY'} sub="secured backend PDF" tone={reportState === 'complete' ? 'green' : undefined} />
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <Panel title="Chain of custody" subtitle={`${auditCount} recorded audit event(s). Each event remains tied to its case/evidence context and entry hash.`} action={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}>
          {!audit?.audit_logs.length ? (
            <div className="border-2 border-dashed border-fvx-navy/12 px-5 py-12 text-center text-xs text-fvx-navy/55">No audit entries available.</div>
          ) : (
            <div className="relative pl-1">
              <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.1 }} style={{ transformOrigin: 'top' }} className="absolute bottom-5 left-[20px] top-5 w-px bg-fvx-teal/25" />
              {audit.audit_logs.map((entry, index) => <AuditRow key={entry.id} entry={entry} index={index} reducedMotion={!!reducedMotion} />)}
            </div>
          )}
        </Panel>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Reveal delay={0.2}>
          <Panel title="Integrity verification" subtitle="The backend verifies each entry against the previous hash.">
            {verify ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className={`border-2 p-5 ${verify.verified ? 'border-fvx-green/50 bg-[#EFF8F3]' : 'border-fvx-red/50 bg-[#FFF1EE]'}`}
              >
                <div className="flex items-start gap-3">
                  {verify.verified ? <CheckCircle2 size={22} className="text-fvx-green" /> : <XCircle size={22} className="text-fvx-red" />}
                  <div>
                    <div className={`text-sm font-black uppercase ${verify.verified ? 'text-fvx-green' : 'text-fvx-red'}`}>
                      {verify.verified ? 'Audit chain verified' : 'Audit chain verification failed'}
                    </div>
                    <div className="mt-2 text-xs text-fvx-navy/55">
                      {verify.verified ? `${checked} entries checked without a reported chain break.` : `Failure detected at entry ${verify.failed_entry_id ?? 'unknown'}.`}
                    </div>
                  </div>
                </div>
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, delay: 0.2 }} style={{ transformOrigin: 'left' }} className={`mt-5 h-1 ${verify.verified ? 'bg-fvx-green' : 'bg-fvx-red'}`} />
              </motion.div>
            ) : (
              <div className="flex items-center gap-3 border-2 border-fvx-navy/10 bg-fvx-paper p-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fvx-navy/55">
                <Loader2 size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Loading audit chain / verification result' : 'Verification result not available'}
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.3} direction="right">
          <Panel title="Report issuance" subtitle="Generate the standardized forensic report from the secured backend.">
            <Button onClick={generateReport} loading={reportState === 'generating'} className="min-h-14 w-full text-sm">
              <Download size={17} /> Generate forensic report PDF
            </Button>
            <div className="mt-4 space-y-3 border-t-2 border-fvx-navy/10 pt-4 text-[10px] leading-4 text-fvx-navy/55">
              <div className="flex items-start gap-2"><Fingerprint size={14} className="mt-0.5 shrink-0 text-fvx-teal" />PDF generation uses case evidence, accepted findings, clock offsets and chain-of-custody audit data.</div>
              {reportState === 'generating' && <div className="border-l-2 border-fvx-orange bg-[#FFF8F4] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fvx-navy/65">Collecting case data → assembling report → generating PDF</div>}
              {reportState === 'complete' && <div className="border-l-2 border-fvx-green bg-[#EFF8F3] px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.1em] text-fvx-green">Report issued successfully</div>}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}

function Summary({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'green' | 'red' }) {
  return (
    <div className="border-2 border-fvx-navy/10 bg-fvx-white p-4">
      <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-fvx-navy/50">{label}</div>
      <div className={`mt-2 font-mono text-lg font-black ${tone === 'green' ? 'text-fvx-green' : tone === 'red' ? 'text-fvx-red' : 'text-fvx-navy'}`}>{value}</div>
      <div className="mt-1 text-[10px] text-fvx-navy/45">{sub}</div>
    </div>
  )
}

function AuditRow({ entry, index, reducedMotion }: { entry: AuditEntry; index: number; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, x: -18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay: Math.min(index * 0.055, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="relative grid grid-cols-[40px_1fr] gap-4 border-b-2 border-fvx-navy/10 bg-fvx-white py-5 pl-1 last:border-b-0"
    >
      <div className="relative z-10 flex justify-center">
        <div className="flex h-8 w-8 items-center justify-center border-2 border-fvx-teal/35 bg-fvx-paper font-mono text-[9px] font-black text-fvx-teal">{String(index + 1).padStart(2, '0')}</div>
      </div>
      <div className="pr-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] text-fvx-navy/45">{formatDate(entry.timestamp)}</span>
          {entry.evidence_id !== null && <span className="font-mono text-[9px] text-fvx-teal">E-{String(entry.evidence_id).padStart(3, '0')}</span>}
        </div>
        <div className="mt-2 text-xs font-black uppercase leading-5 text-fvx-navy">{entry.action}</div>
        <div className="mt-2 border-l-2 border-fvx-navy/10 pl-3 font-mono text-[8px] leading-4 break-all text-fvx-navy/50">HASH {entry.entry_hash}</div>
      </div>
    </motion.div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
