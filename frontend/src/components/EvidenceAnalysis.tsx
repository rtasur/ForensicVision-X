import { CheckCircle2, RefreshCw } from 'lucide-react'
import type { CaseRecord } from '../types'
import { Button, Panel, StatusBadge } from './UI'

export function EvidenceAnalysis({ caseRecord, onRefresh }: { caseRecord: CaseRecord | null; onRefresh: () => Promise<void> }) {
  if (!caseRecord) return <Empty title="Evidence Analysis" text="Load an active case to inspect acquired evidence." />

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-end justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">02 / Evidence</div>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">Evidence Analysis</h1>
          <p className="mt-1 text-xs text-slate-500">Normalized evidence inventory with OEM profile and integrity state.</p>
        </div>
        <Button variant="secondary" onClick={onRefresh}><RefreshCw size={14} /> Refresh case</Button>
      </div>

      <Panel title="Acquired evidence" subtitle={`${caseRecord.evidence.length} item(s) registered under Case ${caseRecord.id}.`}>
        {caseRecord.evidence.length === 0 ? (
          <div className="border border-dashed border-slate-800 px-5 py-12 text-center text-xs text-slate-600">No evidence registered for this case.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600">
                  <th className="px-3 py-3">ID</th><th className="px-3 py-3">File</th><th className="px-3 py-3">Vendor profile</th><th className="px-3 py-3">Camera</th><th className="px-3 py-3">SHA-256</th><th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {caseRecord.evidence.map(e => {
                  const oem = e.metadata?.oem || {}
                  const dvr = e.metadata?.dvr_metadata || {}
                  return (
                    <tr key={e.id} className="border-b border-slate-900 hover:bg-slate-900/30">
                      <td className="px-3 py-4 font-mono text-xs text-slate-500">E-{String(e.id).padStart(3, '0')}</td>
                      <td className="px-3 py-4"><div className="text-xs font-medium text-slate-200">{e.filename}</div><div className="mt-1 text-[10px] text-slate-600">Clock offset {e.clock_offset}s</div></td>
                      <td className="px-3 py-4"><div className="text-xs text-slate-300">{oem.vendor || 'Unknown'}</div><div className="mt-1 font-mono text-[10px] text-slate-600">{oem.profile_id || 'GENERIC_V1'}</div></td>
                      <td className="px-3 py-4"><div className="text-xs text-slate-300">{dvr.camera_id || '—'}</div><div className="mt-1 text-[10px] text-slate-600">{dvr.location || 'Unknown location'}</div></td>
                      <td className="px-3 py-4"><div className="flex min-w-[290px] items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-emerald-400" /><span className="font-mono text-[10px] leading-4 text-slate-500">{e.original_hash}</span></div></td>
                      <td className="px-3 py-4"><StatusBadge status={e.status} tone="green" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="mx-auto max-w-6xl space-y-5"><div className="border-b border-slate-800 pb-4"><div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">Evidence</div><h1 className="mt-1 text-xl font-semibold text-slate-100">{title}</h1></div><div className="border border-dashed border-slate-800 px-5 py-16 text-center text-xs text-slate-600">{text}</div></div>
}
