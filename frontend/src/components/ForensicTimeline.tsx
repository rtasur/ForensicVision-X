import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Clock3, Save, Siren } from 'lucide-react'
import { motion, useScroll, useSpring } from 'motion/react'
import type { CaseRecord, TimelineEvent, TimelineResponse } from '../types'
import { api } from '../lib/api'
import { Reveal } from '../animations/Reveal'
import { SpatialEvidenceView } from './Forensic3D/SpatialEvidenceView'
import { Alert, Button, Panel, StatusBadge } from './UI'

type Message = { text: string; type: 'error' | 'success' | 'info' }

export function ForensicTimeline({ caseRecord }: { caseRecord: CaseRecord | null }) {
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [offsets, setOffsets] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const eventRefs = useRef<Array<HTMLDivElement | null>>([])
  const storyRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ['start 0.82', 'end 0.18'],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 })

  useEffect(() => {
    if (!caseRecord) return
    setOffsets(Object.fromEntries(caseRecord.evidence.map((e) => [e.id, Math.round(e.clock_offset || 0)])))
    setActiveIndex(0)
    setMessage(null)

    api.timeline(caseRecord.id)
      .then(setTimeline)
      .catch((error) => setMessage({ text: error instanceof Error ? error.message : 'Unable to load timeline.', type: 'error' }))
  }, [caseRecord])

  const timelineEvents = useMemo(() => timeline?.timeline ?? [], [timeline])

  useEffect(() => {
    eventRefs.current = eventRefs.current.slice(0, timelineEvents.length)
    if (!timelineEvents.length) return

    const observers = eventRefs.current.map((element, index) => {
      if (!element) return null
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIndex(index)
        },
        { rootMargin: '-42% 0px -42% 0px', threshold: 0.05 },
      )
      observer.observe(element)
      return observer
    })

    return () => observers.forEach((observer) => observer?.disconnect())
  }, [timelineEvents.length])

  async function saveOffset(evidenceId: number) {
    if (!caseRecord) return
    const offset = offsets[evidenceId] ?? 0
    setSaving(evidenceId)
    setMessage(null)
    try {
      await api.normalize(evidenceId, offset)
      const next = await api.timeline(caseRecord.id)
      setTimeline(next)
      setMessage({ text: `Clock offset saved for evidence ${evidenceId}: ${offset >= 0 ? '+' : ''}${offset}s.`, type: 'success' })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to normalize timeline.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  if (!caseRecord) return <Empty />

  const currentEvent = timelineEvents[activeIndex] ?? null

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Reveal>
        <div className="border-b-2 border-fvx-navy/10 pb-5">
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fvx-teal">03 / Temporal normalization</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-fvx-navy">Forensic Timeline</h1>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-fvx-navy/55">Synchronize independent DVR clocks and follow the evidence sequence from preserved original time into normalized forensic time.</p>
        </div>
      </Reveal>

      {message && <Alert message={message.text} type={message.type} />}

      <Reveal delay={0.08}>
        <Panel title="Camera clock normalization" subtitle="Offsets are persisted through the secure normalize endpoint.">
          <div className="space-y-4">
            {caseRecord.evidence.length === 0 && <div className="text-xs text-fvx-navy/55">No evidence available.</div>}
            {caseRecord.evidence.map((e) => {
              const dvr = e.metadata?.dvr_metadata || {}
              const camera = dvr.camera_id || `CAM-${String(e.id).padStart(2, '0')}`
              const value = offsets[e.id] ?? 0
              return (
                <div key={e.id} className="grid gap-4 border-2 border-fvx-navy/10 bg-fvx-white p-4 xl:grid-cols-[180px_1fr_120px] xl:items-center">
                  <div><div className="font-mono text-xs font-black text-fvx-teal">{camera}</div><div className="mt-1 font-mono text-[9px] text-fvx-navy/45">E-{String(e.id).padStart(3, '0')} / CLOCK CONTROL</div></div>
                  <div>
                    <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-fvx-navy/50"><span>-300 sec</span><span className="text-lg font-black text-fvx-navy">{value >= 0 ? '+' : ''}{value}s</span><span>+300 sec</span></div>
                    <input aria-label={`${camera} clock offset`} type="range" min={-300} max={300} step={1} value={value} onChange={(ev) => setOffsets((prev) => ({ ...prev, [e.id]: Number(ev.target.value) }))} className="w-full accent-[#3E756C]" />
                    <div className="mt-2 h-1 bg-fvx-cctv2"><div className="h-full bg-fvx-teal transition-[width] duration-200" style={{ width: `${((value + 300) / 600) * 100}%` }} /></div>
                  </div>
                  <Button onClick={() => saveOffset(e.id)} loading={saving === e.id}><Save size={14} /> Save</Button>
                </div>
              )
            })}
          </div>
        </Panel>
      </Reveal>

      <div ref={storyRef} className="relative">
        <motion.div style={{ scaleY: progress, transformOrigin: 'top' }} className="pointer-events-none absolute bottom-0 left-[18px] top-0 z-0 w-[3px] bg-fvx-teal" />

        <div className="relative z-[1] grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Normalized evidence sequence" subtitle={`${timeline?.event_count ?? 0} event(s) returned by the forensic timeline service.`}>
            {!timelineEvents.length ? (
              <div className="border-2 border-dashed border-fvx-navy/12 px-5 py-12 text-center text-xs text-fvx-navy/55">No timeline events available.</div>
            ) : (
              <div className="space-y-12 pl-8">
                {timelineEvents.map((ev, i) => (
                  <motion.div
                    key={`${ev.evidence_id}-${ev.original_time}-${i}`}
                    ref={(node) => { eventRefs.current[i] = node }}
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                  >
                    <motion.div
                      animate={{ scale: activeIndex === i ? 1.18 : 1, backgroundColor: activeIndex === i ? '#E65A33' : '#3E756C' }}
                      transition={{ duration: 0.35 }}
                      className="absolute -left-[37px] top-2 h-5 w-5 border-2 border-fvx-white bg-fvx-teal p-1 shadow-[0_0_0_2px_#4F8B80]"
                    >
                      <div className="h-full w-full bg-fvx-paper" />
                    </motion.div>

                    <motion.div
                      animate={{ x: activeIndex === i ? 8 : 0, borderColor: activeIndex === i ? 'rgba(62,117,108,.55)' : 'rgba(11,38,58,.10)' }}
                      transition={{ duration: 0.45 }}
                      className="grid gap-4 border-2 bg-fvx-white p-4 md:grid-cols-[150px_1fr_1fr] md:items-center"
                    >
                      <div><div className="font-mono text-[9px] font-black uppercase text-fvx-teal">{ev.camera_id}</div><div className="mt-1 font-mono text-[9px] text-fvx-navy/45">{ev.filename}</div></div>
                      <div><div className="font-mono text-[9px] uppercase tracking-wider text-fvx-navy/45">Original</div><div className="mt-1 font-mono text-xs font-black text-fvx-navy">{formatDate(ev.original_time)}</div></div>
                      <div><div className="font-mono text-[9px] uppercase tracking-wider text-fvx-navy/45">Normalized</div><div className="mt-1 font-mono text-sm font-black text-fvx-teal">{formatDate(ev.normalized_time)}</div></div>
                      <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t border-fvx-navy/10 pt-3">
                        <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-fvx-navy"><Clock3 size={13} className="text-fvx-navy/45" /> {ev.event_type}</span>
                        <StatusBadge status={`${ev.clock_offset_seconds >= 0 ? '+' : ''}${ev.clock_offset_seconds}s`} tone="blue" />
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            )}
          </Panel>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Panel title="Temporal narrative" subtitle="The pinned card follows the event currently crossing the reading zone.">
              {currentEvent ? <TimelineNarrative event={currentEvent} index={activeIndex} total={timelineEvents.length} /> : <div className="py-8 text-xs text-fvx-navy/55">Awaiting timeline data.</div>}
            </Panel>
          </aside>
        </div>
      </div>

      <Reveal delay={0.1}>
        <SpatialEvidenceView events={timelineEvents} activeIndex={activeIndex} />
      </Reveal>
    </div>
  )
}

function TimelineNarrative({ event, index, total }: { event: TimelineEvent; index: number; total: number }) {
  return (
    <motion.div key={`${event.evidence_id}-${event.original_time}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex items-center justify-between font-mono text-[8px] font-black uppercase tracking-[0.12em] text-fvx-navy/45">
        <span>EVENT {String(index + 1).padStart(2, '0')}</span>
        <span>{String(total).padStart(2, '0')} TOTAL</span>
      </div>
      <div className="mt-5 border-2 border-fvx-teal/25 bg-[#EEF5F2] p-4">
        <div className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-fvx-teal">{event.camera_id}</div>
        <div className="mt-2 text-lg font-black uppercase text-fvx-navy">{event.event_type}</div>
        <div className="mt-5 grid gap-3">
          <TimeRow label="Original" value={formatDate(event.original_time)} />
          <div className="flex justify-center text-fvx-teal"><ArrowDown size={14} /></div>
          <TimeRow label="Normalized" value={formatDate(event.normalized_time)} accent />
        </div>
        <div className="mt-5 border-t border-fvx-navy/10 pt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-fvx-navy/55">
          Clock correction <span className="font-black text-fvx-orange">{event.clock_offset_seconds >= 0 ? '+' : ''}{event.clock_offset_seconds}s</span>
        </div>
      </div>
    </motion.div>
  )
}

function TimeRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-fvx-navy/10 bg-fvx-white p-3">
      <div className="font-mono text-[8px] font-black uppercase tracking-[0.1em] text-fvx-navy/45">{label}</div>
      <div className={`mt-2 font-mono text-[11px] font-black ${accent ? 'text-fvx-teal' : 'text-fvx-navy'}`}>{value}</div>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function Empty() {
  return <div className="mx-auto max-w-6xl border-2 border-dashed border-fvx-navy/12 bg-fvx-white px-5 py-16 text-center text-xs text-fvx-navy/55"><Siren size={24} className="mx-auto mb-3 text-fvx-teal" />Load an active case to build the forensic timeline.</div>
}
