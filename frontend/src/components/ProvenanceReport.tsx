import { useEffect, useState } from 'react'
import { Download, Fingerprint, ShieldCheck } from 'lucide-react'
import type { AuditEntry, AuditResponse, CaseRecord, VerifyResponse } from '../types'
import { api } from '../lib/api'
import { Alert, Button, IntegritySeal, Panel } from './UI'

export function ProvenanceReport({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const [audit, setAudit] = useState<AuditResponse | null>(null)
  const [verify, setVerify] = useState<VerifyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null)

  useEffect(() => {
    if (!caseRecord) return
    setAudit(null); setVerify(null)
    setLoading(true)
    Promise.all([api.audit(caseRecord.id), api.verifyAudit(caseRecord.id)])
      .then(([a, v]) => { setAudit(a); setVerify(v) })
      .catch(error => setMessage({ text: error instanceof Error ? error.message : 'Unable to load provenance.', type: 'error' }))
      .finally(() => setLoading(false))
  }, [caseRecord?.id])

  async function refresh() {
    if (!caseRecord) return
    setLoading(true); setMessage(null)
    try { const [a, v] = await Promise.all([api.audit(caseRecord.id), api.verifyAudit(caseRecord.id)]); setAudit(a); setVerify(v) }
    catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to load provenance.', type: 'error' }) }
    finally { setLoading(false) }
  }

  async function generateReport() {
    if (!caseRecord) return
    setReporting(true); setMessage(null)
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
      setMessage({ text: `Forensic report generated for Case ${caseRecord.id}.`, type: 'success' })
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to generate report.', type: 'error' }) }
    finally { setReporting(false) }
  }

  if (!caseRecord) return <div className="mx-auto max-w-6xl border border-dashed border-slate-800 px-5 py-16 text-center text-xs text-slate-600">Load an active case to inspect provenance and generate the report.</div>

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-end justify-between border-b border-slate-800 pb-4"><div><div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">05 / Provenance</div><h1 className="mt-1 text-xl font-semibold text-slate-100">Provenance & Report</h1><p className="mt-1 text-xs text-slate-500">Review the chronological chain of custody, verify the audit hash chain, and issue the final PDF report.</p></div><IntegritySeal verified={verify?.verified ?? null} /></div>
      {message && <Alert message={message.text} type={message.type} />}

      <Panel title="Chain of custody" subtitle={`${audit?.audit_count ?? 0} recorded audit event(s).`} action={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}>
        {!audit?.audit_logs.length ? <div className="border border-dashed border-slate-800 px-5 py-12 text-center text-xs text-slate-600">No audit entries available.</div> : <div className="space-y-0">{audit.audit_logs.map((entry, index) => <AuditRow key={entry.id} entry={entry} index={index} />)}</div>}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="Integrity verification" subtitle="The backend verifies each entry against the previous hash and supports legacy pre-hardening entries.">
          {verify ? <div className={`flex items-start gap-3 border p-4 ${verify.verified ? 'border-emerald-900/70 bg-emerald-950/30' : 'border-red-900/70 bg-red-950/30'}`}><ShieldCheck size={20} className={verify.verified ? 'text-emerald-400' : 'text-red-400'} /><div><div className={`text-sm font-semibold ${verify.verified ? 'text-emerald-300' : 'text-red-300'}`}>{verify.verified ? 'Audit chain verified' : 'Audit chain verification failed'}</div><div className="mt-1 text-xs text-slate-500">{verify.verified ? `${verify.entries_checked ?? audit?.audit_count ?? 0} entries checked.` : `Failure detected at entry ${verify.failed_entry_id ?? 'unknown'}.`}</div></div></div> : <div className="text-xs text-slate-600">Verification pending.</div>}
        </Panel>
        <Panel title="Report issuance" subtitle="Generate the standardized forensic report from the secured backend.">
          <Button onClick={generateReport} loading={reporting} className="min-h-12 w-full border-sky-600 bg-sky-700 text-sm tracking-[0.08em]"><Download size={16} /> Generate forensic report PDF</Button>
          <div className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-slate-600"><Fingerprint size={14} className="mt-0.5 shrink-0" />PDF generation uses the case evidence, accepted findings, clock offsets, and chain-of-custody audit trail.</div>
        </Panel>
      </div>
    </div>
  )
}

function AuditRow({ entry, index }: { entry: AuditEntry; index: number }) {
  return <div className="grid grid-cols-[34px_1fr] gap-3 border-b border-slate-900 py-4"><div className="flex justify-center"><div className="flex h-7 w-7 items-center justify-center border border-slate-800 bg-slate-950 font-mono text-[9px] text-slate-600">{String(index + 1).padStart(2, '0')}</div></div><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-slate-600">{formatDate(entry.timestamp)}</span>{entry.evidence_id !== null && <span className="font-mono text-[10px] text-slate-700">E-{String(entry.evidence_id).padStart(3, '0')}</span>}</div><div className="mt-1 text-xs font-medium text-slate-300">{entry.action}</div><div className="mt-2 break-all border-l border-slate-800 pl-3 font-mono text-[9px] leading-4 text-slate-600">HASH {entry.entry_hash}</div></div></div>
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }
