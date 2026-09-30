import { useEffect, useState } from 'react'
import { Save, Clock3 } from 'lucide-react'
import type { CaseRecord, TimelineResponse } from '../types'
import { api } from '../lib/api'
import { Alert, Button, Panel, StatusBadge } from './UI'

export function ForensicTimeline({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [offsets, setOffsets] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!caseRecord) return
    setOffsets(Object.fromEntries(caseRecord.evidence.map(e => [e.id, Math.round(e.clock_offset || 0)])))
    api.timeline(caseRecord.id).then(setTimeline).catch(err => setMessage(err.message))
  }, [caseRecord])

  async function saveOffset(evidenceId: number) {
    const offset = offsets[evidenceId] ?? 0
    setSaving(evidenceId)
    setMessage(null)
    try {
      await api.normalize(evidenceId, offset)
      const next = await api.timeline(caseRecord!.id)
      setTimeline(next)
      setMessage(`Clock offset saved for evidence ${evidenceId}: ${offset >= 0 ? '+' : ''}${offset}s.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to normalize timeline.') }
    finally { setSaving(null) }
  }

  if (!caseRecord) return <Empty />
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="border-b border-slate-800 pb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">03 / Temporal normalization</div>
        <h1 className="mt-1 text-xl font-semibold text-slate-100">Forensic Timeline</h1>
        <p className="mt-1 text-xs text-slate-500">Apply DVR clock offsets and review original-to-normalized event times.</p>
      </div>
      {message && <Alert message={message} type="success" />}

      <Panel title="Camera clock normalization" subtitle="Offsets are persisted through the secure normalize endpoint.">
        <div className="space-y-3">
          {caseRecord.evidence.length === 0 && <div className="text-xs text-slate-600">No evidence available.</div>}
          {caseRecord.evidence.map(e => {
            const dvr = e.metadata?.dvr_metadata || {}
            const camera = dvr.camera_id || `CAM-${String(e.id).padStart(2, '0')}`
            const value = offsets[e.id] ?? 0
            return (
              <div key={e.id} className="grid gap-4 border border-slate-800 bg-slate-950/50 p-4 xl:grid-cols-[180px_1fr_110px] xl:items-center">
                <div><div className="font-mono text-xs text-sky-300">{camera}</div><div className="mt-1 text-[10px] text-slate-600">Evidence E-{String(e.id).padStart(3, '0')}</div></div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-600"><span>-300 sec</span><span className="font-mono text-slate-300">{value >= 0 ? '+' : ''}{value}s</span><span>+300 sec</span></div>
                  <input aria-label={`${camera} clock offset`} type="range" min={-300} max={300} step={1} value={value} onChange={ev => setOffsets(prev => ({ ...prev, [e.id]: Number(ev.target.value) }))} className="w-full accent-sky-500" />
                </div>
                <Button onClick={() => saveOffset(e.id)} loading={saving === e.id}><Save size={14} /> Save</Button>
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="Original time → normalized time" subtitle={`${timeline?.event_count ?? 0} event(s) returned by the forensic timeline service.`}>
        {!timeline?.timeline.length ? <div className="border border-dashed border-slate-800 px-5 py-12 text-center text-xs text-slate-600">No timeline events available.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead><tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><th className="px-3 py-3">Camera</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Original time</th><th className="px-3 py-3">Normalized time</th><th className="px-3 py-3">Offset</th></tr></thead>
              <tbody>{timeline.timeline.map((ev, i) => <tr key={`${ev.evidence_id}-${i}`} className="border-b border-slate-900 hover:bg-slate-900/30"><td className="px-3 py-4 font-mono text-xs text-sky-300">{ev.camera_id}</td><td className="px-3 py-4 text-xs text-slate-300"><span className="inline-flex items-center gap-2"><Clock3 size={13} className="text-slate-600" /> {ev.event_type}</span></td><td className="px-3 py-4 font-mono text-[11px] text-slate-500">{formatDate(ev.original_time)}</td><td className="px-3 py-4 font-mono text-[11px] text-slate-200">{formatDate(ev.normalized_time)}</td><td className="px-3 py-4"><StatusBadge status={`${ev.clock_offset_seconds >= 0 ? '+' : ''}${ev.clock_offset_seconds}s`} tone="blue" /></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
function Empty() { return <div className="mx-auto max-w-6xl border border-dashed border-slate-800 px-5 py-16 text-center text-xs text-slate-600">Load an active case to build the forensic timeline.</div> }
