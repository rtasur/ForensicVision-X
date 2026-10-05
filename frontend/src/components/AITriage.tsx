import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Crosshair, Eye, Image as ImageIcon, ScanLine, ShieldCheck, Target, Video } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { AnalyzeResponse, CaseRecord, Detection } from '../types'
import { api } from '../lib/api'
import { Reveal } from '../animations/Reveal'
import { staggerContainer, staggerItem } from '../animations/variants'
import { Alert, Button, Panel, StatusBadge } from './UI'
import { CameraFeed } from './CCTV/CameraFeed'
import { TrackingBox } from './CCTV/TrackingBox'

type Message = { text: string; type: 'error' | 'success' | 'info' }

export function AITriage({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const [selectedEvidence, setSelectedEvidence] = useState<number | null>(caseRecord?.evidence[0]?.id ?? null)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [savingDecision, setSavingDecision] = useState<number | null>(null)
  const [selectedFindingIndex, setSelectedFindingIndex] = useState(0)
  const [message, setMessage] = useState<Message | null>(null)
  const [frameDimensions, setFrameDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    setAnalysis(null)
    setSelectedFindingIndex(0)
    setFrameDimensions(null)
    setImageUrl((old) => { if (old) URL.revokeObjectURL(old); return null })
    setSelectedEvidence(caseRecord?.evidence[0]?.id ?? null)
    setMessage(null)
  }, [caseRecord?.id])

  useEffect(() => {
    if (!imageUrl) return
    const image = new Image()
    image.onload = () => setFrameDimensions({ width: image.naturalWidth, height: image.naturalHeight })
    image.src = imageUrl
    return () => { image.onload = null }
  }, [imageUrl])

  const selectedEvidenceRecord = useMemo(
    () => caseRecord?.evidence.find((e) => e.id === selectedEvidence) ?? null,
    [caseRecord, selectedEvidence],
  )

  const selectedFinding = analysis?.detections[selectedFindingIndex] ?? null
  const findingCount = analysis?.detections.length ?? 0

  async function runAnalysis() {
    if (!selectedEvidence) return
    setRunning(true)
    setMessage(null)
    setSelectedFindingIndex(0)
    try {
      const result = await api.analyze(selectedEvidence)
      setAnalysis(result)
      const url = await api.protectedImage(result.annotated_frame.path)
      setImageUrl((old) => { if (old) URL.revokeObjectURL(old); return url })
      setSelectedFindingIndex(0)
      setMessage({ text: `${result.engine} completed. ${result.detections.length} finding(s) returned.`, type: 'success' })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'AI analysis failed.', type: 'error' })
    } finally {
      setRunning(false)
    }
  }

  async function decide(finding: Detection, decision: 'ACCEPT' | 'REJECT') {
    setSavingDecision(finding.triage_id)
    setMessage(null)
    try {
      await api.decide(finding.triage_id, decision)
      const updated = { ...finding, decision }
      setAnalysis((prev) => prev ? ({ ...prev, detections: prev.detections.map((d) => d.triage_id === finding.triage_id ? updated : d) }) : prev)
      setMessage({ text: `Finding ${finding.triage_id} marked ${decision}.`, type: 'success' })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to record triage decision.', type: 'error' })
    } finally {
      setSavingDecision(null)
    }
  }

  function getDisplayedBox(finding: Detection) {
    if (!frameDimensions) return null
    const [x1, y1, x2, y2] = finding.bbox
    const imageAspect = frameDimensions.width / frameDimensions.height
    const containerAspect = 16 / 9
    let displayWidth = 100
    let displayHeight = 100
    let offsetX = 0
    let offsetY = 0
    if (imageAspect > containerAspect) {
      displayHeight = (containerAspect / imageAspect) * 100
      offsetY = (100 - displayHeight) / 2
    } else {
      displayWidth = (imageAspect / containerAspect) * 100
      offsetX = (100 - displayWidth) / 2
    }
    return {
      x: offsetX + (x1 / frameDimensions.width) * displayWidth,
      y: offsetY + (y1 / frameDimensions.height) * displayHeight,
      width: ((x2 - x1) / frameDimensions.width) * displayWidth,
      height: ((y2 - y1) / frameDimensions.height) * displayHeight,
    }
  }

  function selectEvidence(value: number) {
    setSelectedEvidence(value)
    setAnalysis(null)
    setSelectedFindingIndex(0)
    setFrameDimensions(null)
    setMessage(null)
    setImageUrl((old) => { if (old) URL.revokeObjectURL(old); return null })
  }

  if (!caseRecord) return <div className="mx-auto max-w-6xl border-2 border-dashed border-fvx-navy/12 bg-fvx-white px-5 py-20 text-center"><Crosshair size={32} className="mx-auto text-fvx-teal" /><div className="mt-4 font-mono text-xs font-black uppercase tracking-[0.12em] text-fvx-navy">AI triage unavailable</div><div className="mt-2 text-xs text-fvx-navy/55">Load an active case to review AI-assisted CCTV findings.</div></div>

  const selectedBox = selectedFinding ? getDisplayedBox(selectedFinding) : null

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-fvx-navy/10 pb-5">
          <div>
            <div className="flex items-center gap-3 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fvx-teal"><span className="h-2 w-2 bg-fvx-orange" />04 / Human-in-the-loop review</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-fvx-navy">AI Triage</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-fvx-navy/55">Review protected YOLO output, inspect detections in context, and record the examiner disposition against the evidence.</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase text-fvx-navy/50"><Crosshair size={14} className="text-fvx-teal" /> YOLOv8n / protected output</div>
        </div>
      </Reveal>

      {message && <Alert message={message.text} type={message.type} />}

      <Reveal delay={0.06}>
        <div className="grid border-2 border-fvx-navy/10 bg-fvx-white sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Evidence" value={selectedEvidenceRecord ? `E-${String(selectedEvidenceRecord.id).padStart(3, '0')}` : '—'} />
          <MiniStat label="Detections" value={String(findingCount)} />
          <MiniStat label="Frame" value={analysis ? `${analysis.frame.frame_index}/${analysis.frame.total_frames}` : '—'} />
          <MiniStat label="Protection" value="AUTH REQUIRED" tone="green" />
        </div>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Reveal direction="left" delay={0.08}>
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[9px] font-black uppercase text-fvx-navy/50">Protected evidence viewport</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-black text-fvx-navy"><Video size={15} />{selectedEvidenceRecord?.filename ?? 'No evidence selected'}</div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase text-fvx-navy/50"><ScanLine size={14} /> CCTV analysis mode</div>
            </div>

            <div className="relative">
              <CameraFeed src={imageUrl ?? undefined} camera={selectedEvidenceRecord?.metadata?.dvr_metadata?.camera_id || 'CAM-01'} location={selectedEvidenceRecord?.metadata?.dvr_metadata?.location || 'WAREHOUSE / MAIN ENTRANCE'} />
              {selectedFinding && selectedBox && <TrackingBox {...selectedBox} label={selectedFinding.label} confidence={selectedFinding.confidence} />}
              {running && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-fvx-paper/75 backdrop-blur-[1px]">
                  <motion.div animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.1, repeat: Infinity }} className="border-2 border-fvx-teal bg-fvx-paper px-5 py-4 text-center shadow-[5px_5px_0_#0b263a]">
                    <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fvx-teal">Analysis running</div>
                    <div className="mt-2 text-xs font-bold text-fvx-navy">Extracting frame · running model · preparing human review</div>
                  </motion.div>
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-x-2 border-b-2 border-fvx-navy/10 bg-fvx-paper px-4 py-3">
              <div className="flex flex-wrap items-center gap-5 font-mono text-[9px] uppercase tracking-[0.08em] text-fvx-navy/45"><span className="flex items-center gap-2"><span className="h-2 w-2 bg-fvx-green" />Protected</span><span>Source: protected</span><span>Model: YOLOv8n</span></div>
              <div className="font-mono text-[9px] text-fvx-teal">{frameDimensions ? `${frameDimensions.width} × ${frameDimensions.height}` : 'FRAME DIMENSIONS —'}</div>
            </div>
          </section>
        </Reveal>

        <aside className="space-y-5">
          <Reveal direction="right" delay={0.12}>
            <Panel title="Analysis control" subtitle="Select an acquired evidence item and run the AI-assisted analysis.">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block font-mono text-[9px] font-black uppercase text-fvx-navy/50">Evidence source</span>
                  <select value={selectedEvidence ?? ''} onChange={(e) => selectEvidence(Number(e.target.value))} className="focus-ring w-full border-2 border-fvx-navy/12 bg-fvx-white px-3 py-3 text-xs font-bold text-fvx-navy">
                    {caseRecord.evidence.map((e) => <option key={e.id} value={e.id}>E-{String(e.id).padStart(3, '0')} — {e.filename}</option>)}
                  </select>
                </label>
                <Button onClick={runAnalysis} loading={running} className="min-h-12 w-full"><Eye size={15} /> Analyze evidence</Button>
              </div>
            </Panel>
          </Reveal>

          <Reveal direction="right" delay={0.17}>
            <Panel title="Selected finding" subtitle={selectedFinding ? 'Current examiner review target.' : 'Run analysis to populate the review target.'}>
              <AnimatePresence mode="wait">
                {selectedFinding ? (
                  <motion.div key={selectedFinding.triage_id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.55 }} className="space-y-5">
                    <div className="flex items-center justify-between border-2 border-fvx-navy/10 bg-[#F8F5EC] px-4 py-3">
                      <div className="font-mono text-[9px] font-black uppercase text-fvx-teal">FINDING #{selectedFinding.triage_id}</div>
                      <StatusBadge status={selectedFinding.decision} />
                    </div>

                    <div className="grid grid-cols-2 border-2 border-fvx-navy/10 bg-fvx-white">
                      <div className="border-r border-fvx-navy/10 p-4"><div className="font-mono text-[9px] uppercase text-fvx-navy/45">Class</div><div className="mt-1 font-mono text-lg font-black uppercase text-fvx-navy">{selectedFinding.label}</div></div>
                      <div className="p-4"><div className="font-mono text-[9px] uppercase text-fvx-navy/45">Confidence</div><div className="mt-1 font-mono text-lg font-black text-fvx-teal">{(selectedFinding.confidence * 100).toFixed(1)}%</div></div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between font-mono text-[9px] font-black uppercase text-fvx-navy/50"><span>Confidence signal</span><span>{(selectedFinding.confidence * 100).toFixed(1)}%</span></div>
                      <div className="h-2 bg-fvx-cctv2"><motion.div initial={{ width: 0 }} animate={{ width: `${selectedFinding.confidence * 100}%` }} transition={{ duration: 0.8 }} className="h-full bg-fvx-teal" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => decide(selectedFinding, 'ACCEPT')} loading={savingDecision === selectedFinding.triage_id} disabled={savingDecision !== null && savingDecision !== selectedFinding.triage_id} className="min-h-12"><Check size={15} /> Accept</Button>
                      <Button onClick={() => decide(selectedFinding, 'REJECT')} loading={savingDecision === selectedFinding.triage_id} disabled={savingDecision !== null && savingDecision !== selectedFinding.triage_id} variant="danger" className="min-h-12"><AlertTriangle size={15} /> Reject</Button>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t-2 border-fvx-navy/10 pt-4">
                      <button type="button" onClick={() => setSelectedFindingIndex((index) => Math.max(0, index - 1))} disabled={selectedFindingIndex === 0} className="focus-ring flex items-center justify-center gap-2 border-2 border-fvx-navy/10 bg-fvx-white px-3 py-2 font-mono text-[9px] font-black uppercase text-fvx-navy disabled:opacity-30"><ArrowLeft size={13} /> Previous</button>
                      <div className="font-mono text-[9px] font-black uppercase text-fvx-navy/45">{selectedFindingIndex + 1} / {findingCount}</div>
                      <button type="button" onClick={() => setSelectedFindingIndex((index) => Math.min(findingCount - 1, index + 1))} disabled={selectedFindingIndex >= findingCount - 1} className="focus-ring flex items-center justify-center gap-2 border-2 border-fvx-navy/10 bg-fvx-white px-3 py-2 font-mono text-[9px] font-black uppercase text-fvx-navy disabled:opacity-30">Next <ArrowRight size={13} /></button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-8 text-center"><Crosshair size={25} className="mx-auto text-fvx-teal" /><div className="mt-3 text-xs text-fvx-navy/55">No finding selected.</div></div>
                )}
              </AnimatePresence>
            </Panel>
          </Reveal>
        </aside>
      </div>

      <Reveal delay={0.12}>
        <Panel title="Detection register" subtitle={analysis ? `${analysis.detections.length} finding(s) returned by the analysis engine.` : 'No AI analysis has been loaded.'} action={analysis ? <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-fvx-teal"><ShieldCheck size={13} /> Register active</div> : undefined}>
          {!analysis?.detections.length ? (
            <div className="border-2 border-dashed border-fvx-navy/12 px-5 py-10 text-center"><ImageIcon size={25} className="mx-auto text-fvx-teal/60" /><div className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fvx-navy/50">Run analysis to populate the detection register</div></div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="divide-y-2 divide-fvx-navy/10 border-2 border-fvx-navy/10">
              {analysis.detections.map((finding, index) => (
                <motion.button
                  key={finding.triage_id}
                  type="button"
                  variants={staggerItem}
                  onClick={() => setSelectedFindingIndex(index)}
                  className={`group flex w-full items-center justify-between gap-5 px-5 py-4 text-left transition ${selectedFindingIndex === index ? 'bg-[#EDF5F2]' : 'bg-fvx-white hover:bg-fvx-paper'}`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 font-mono text-[10px] font-black ${selectedFindingIndex === index ? 'border-fvx-teal bg-fvx-teal text-white' : 'border-fvx-navy/12 bg-fvx-white text-fvx-navy/50'}`}>{String(index + 1).padStart(2, '0')}</div>
                    <div className="min-w-0"><div className="font-mono text-xs font-black uppercase text-fvx-navy">{finding.label}</div><div className="mt-1 truncate font-mono text-[9px] text-fvx-navy/45">Triage {finding.triage_id} · {finding.source_class} · bbox {finding.bbox.join(', ')}</div></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4"><div className="text-right"><div className="font-mono text-sm font-black text-fvx-teal">{(finding.confidence * 100).toFixed(1)}%</div><div className="mt-1 font-mono text-[8px] uppercase text-fvx-navy/45">confidence</div></div><StatusBadge status={finding.decision} /></div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </Panel>
      </Reveal>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return <div className="border-b-2 border-fvx-navy/10 p-4 last:border-b-0 sm:border-b-0 sm:border-r-2 xl:last:border-r-0"><div className="font-mono text-[9px] font-black uppercase text-fvx-navy/50">{label}</div><div className={`mt-2 font-mono text-lg font-black ${tone === 'green' ? 'text-fvx-green' : 'text-fvx-navy'}`}>{value}</div></div>
}
