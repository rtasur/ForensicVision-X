import { useEffect, useState } from 'react'
import { Check, Crosshair, Eye, Image as ImageIcon } from 'lucide-react'
import type { AnalyzeResponse, CaseRecord, Detection } from '../types'
import { api } from '../lib/api'
import { Alert, Button, Panel, StatusBadge } from './UI'

export function AITriage({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const [selectedEvidence, setSelectedEvidence] = useState<number | null>(caseRecord?.evidence[0]?.id ?? null)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [savingDecision, setSavingDecision] = useState<number | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null)

  useEffect(() => {
    setAnalysis(null)
    setImageUrl(old => { if (old) URL.revokeObjectURL(old); return null })
    setSelectedEvidence(caseRecord?.evidence[0]?.id ?? null)
  }, [caseRecord?.id])

  async function runAnalysis() {
    if (!selectedEvidence) return
    setRunning(true); setMessage(null)
    try {
      const result = await api.analyze(selectedEvidence)
      setAnalysis(result)
      const url = await api.protectedImage(result.annotated_frame.path)
      setImageUrl(url)
      setMessage({ text: `${result.engine} completed. ${result.detections.length} finding(s) returned.`, type: 'success' })
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'AI analysis failed.', type: 'error' }) }
    finally { setRunning(false) }
  }

  async function decide(finding: Detection, decision: 'ACCEPT' | 'REJECT') {
    setSavingDecision(finding.triage_id); setMessage(null)
    try {
      await api.decide(finding.triage_id, decision)
      setAnalysis(prev => prev ? ({ ...prev, detections: prev.detections.map(d => d.triage_id === finding.triage_id ? { ...d, decision } : d) }) : prev)
      setMessage({ text: `Finding ${finding.triage_id} marked ${decision}.`, type: 'success' })
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to record triage decision.', type: 'error' }) }
    finally { setSavingDecision(null) }
  }

  if (!caseRecord) return <div className="mx-auto max-w-6xl border border-dashed border-slate-800 px-5 py-16 text-center text-xs text-slate-600">Load an active case to review AI triage.</div>

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-end justify-between border-b border-slate-800 pb-4">
        <div><div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">04 / Human-in-the-loop review</div><h1 className="mt-1 text-xl font-semibold text-slate-100">AI Triage</h1><p className="mt-1 text-xs text-slate-500">Review the protected annotated frame and disposition each AI finding.</p></div>
        <div className="flex items-center gap-2"><Crosshair size={16} className="text-slate-600" /><span className="font-mono text-[10px] text-slate-500">YOLOv8n</span></div>
      </div>
      {message && <Alert message={message.text} type={message.type} />}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Annotated frame" subtitle="The image is served only through the protected evidence route.">
          {imageUrl ? <div className="border border-slate-800 bg-black"><img src={imageUrl} alt="Protected YOLO annotated frame" className="mx-auto max-h-[600px] w-auto object-contain" /></div> : <div className="flex min-h-[420px] items-center justify-center border border-dashed border-slate-800 bg-black/20 text-center"><div><ImageIcon size={28} className="mx-auto text-slate-700" /><div className="mt-3 text-xs text-slate-600">Run analysis to load the protected frame.</div></div></div>}
        </Panel>

        <div className="space-y-5">
          <Panel title="Analysis control" subtitle="Select an acquired evidence item.">
            <div className="space-y-3">
              <label className="block"><span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Evidence</span><select value={selectedEvidence ?? ''} onChange={e => setSelectedEvidence(Number(e.target.value))} className="focus-ring w-full border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200">{caseRecord.evidence.map(e => <option key={e.id} value={e.id}>E-{String(e.id).padStart(3, '0')} — {e.filename}</option>)}</select></label>
              <Button onClick={runAnalysis} loading={running} className="w-full"><Eye size={14} /> Analyze evidence</Button>
            </div>
          </Panel>

          <Panel title="Findings" subtitle={analysis ? `${analysis.detections.length} detection(s), frame ${analysis.frame.frame_index}/${analysis.frame.total_frames}.` : 'No analysis loaded.'}>
            {!analysis?.detections.length ? <div className="text-xs text-slate-600">No findings to review.</div> : <div className="space-y-3">{analysis.detections.map(f => <div key={f.triage_id} className="border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold text-slate-200">Triage {f.triage_id} · {f.label}</div><div className="mt-1 font-mono text-[10px] text-slate-600">{(f.confidence * 100).toFixed(1)}% · {f.source_class} · bbox {f.bbox.join(', ')}</div></div><StatusBadge status={f.decision} /></div><div className="mt-3 flex gap-2"><Button onClick={() => decide(f, 'ACCEPT')} loading={savingDecision === f.triage_id} disabled={savingDecision !== null && savingDecision !== f.triage_id} className="flex-1"><Check size={14} /> Accept finding</Button><Button onClick={() => decide(f, 'REJECT')} loading={savingDecision === f.triage_id} disabled={savingDecision !== null && savingDecision !== f.triage_id} variant="danger" className="flex-1">Reject finding</Button></div></div>)}</div>}
          </Panel>
        </div>
      </div>
    </div>
  )
}
