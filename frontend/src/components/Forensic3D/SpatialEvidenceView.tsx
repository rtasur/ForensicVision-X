import { useEffect, useMemo, useState } from 'react'
import { Box, Camera, RadioTower, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { TimelineEvent } from '../../types'

export function SpatialEvidenceView({ events, activeIndex = 0 }: { events: TimelineEvent[]; activeIndex?: number }) {
  const [xrReady, setXrReady] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const nav = navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }
    if (!nav.xr?.isSessionSupported) return
    nav.xr.isSessionSupported('immersive-vr').then(setXrReady).catch(() => setXrReady(false))
  }, [])

  const markers = useMemo(() => events.slice(0, 8).map((event, index) => ({
    event,
    left: 18 + ((index * 19) % 64),
    top: 24 + ((index * 17) % 48),
  })), [events])

  return (
    <div className="relative overflow-hidden border-2 border-fvx-navy/12 bg-fvx-cctv shadow-[7px_7px_0_#0b263a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#EAF2EF_0,#DDE7E3_70%)]" />
      <div className="absolute inset-0 spatial-grid opacity-40" />

      <div className="relative min-h-[440px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fvx-teal">Spatial forensic view</div>
            <div className="mt-1 text-sm font-black uppercase text-fvx-navy">Illustrative spatial projection</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-fvx-navy/45">Derived from event relationships · not calibrated camera geometry</div>
          </div>

          <div className="flex items-center gap-2 border border-fvx-navy/12 bg-fvx-paper/85 px-3 py-2 font-mono text-[9px] uppercase text-fvx-navy/60">
            <Box size={13} />
            {xrReady ? 'WEBXR READY' : 'WEBXR NOT DETECTED'}
          </div>
        </div>

        <div className="relative mx-auto mt-10 h-[310px] max-w-3xl [perspective:1100px]">
          <motion.div
            animate={reducedMotion ? undefined : { rotateX: [58, 60, 58], rotateY: [-8, 8, -8] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-8 border border-fvx-corners/45 [transform-style:preserve-3d]"
          >
            <div className="absolute left-1/2 top-5 -translate-x-1/2 text-center [transform:translateZ(80px)]">
              <Camera size={28} className="mx-auto text-fvx-teal" />
              <div className="mt-1 font-mono text-[9px] font-black text-fvx-teal">CAM-01</div>
            </div>

            <div className="absolute left-1/2 top-1/2 h-[54%] w-[58%] -translate-x-1/2 -translate-y-1/2 border border-fvx-corners/30 bg-fvx-teal/[0.035] [transform:translateZ(20px)]" />
            <div className="absolute left-[24%] top-[30%] h-[40%] w-px bg-fvx-corners/30 [transform:translateZ(10px)]" />
            <div className="absolute left-[76%] top-[30%] h-[40%] w-px bg-fvx-corners/30 [transform:translateZ(10px)]" />

            {markers.map(({ event, left, top }, index) => {
              const active = index === activeIndex
              return (
                <motion.div
                  key={`${event.evidence_id}-${event.original_time}-${index}`}
                  animate={reducedMotion ? undefined : { y: active ? [0, -7, 0] : [0, -4, 0], opacity: active ? [0.8, 1, 0.8] : [0.55, 0.9, 0.55], scale: active ? [1, 1.12, 1] : 1 }}
                  transition={{ duration: active ? 1.7 : 2.8, delay: index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute [transform:translateZ(95px)]"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <div className={`h-3 w-3 border-2 ${active ? 'border-fvx-orange bg-fvx-orange/25' : 'border-fvx-corners bg-fvx-tealLight/25'}`} />
                  <div className="mt-1 whitespace-nowrap border border-fvx-navy/10 bg-fvx-paper/90 px-2 py-1 font-mono text-[8px] uppercase text-fvx-navy/70">
                    {event.event_type}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fvx-navy/45">
          <span className="flex items-center gap-2"><RadioTower size={12} /> Active timeline event: {markers[activeIndex]?.event.event_type || '—'}</span>
          <span className="flex items-center gap-2"><ShieldCheck size={12} /> Spatial coordinates remain illustrative</span>
        </div>
      </div>
    </div>
  )
}
