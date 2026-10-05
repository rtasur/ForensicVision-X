import { motion, useReducedMotion } from 'motion/react'
import { RadarSweep } from './RadarSweep'
import type { CameraWallItem } from '../../lib/camera'

const fallback: CameraWallItem[] = [
  { camera: 'CAM-01', location: 'MAIN ENTRANCE', status: 'STANDBY', recording: false },
  { camera: 'CAM-02', location: 'LOADING BAY', status: 'STANDBY', recording: false },
]

function formatDuration(value?: number) {
  if (!Number.isFinite(value)) return null
  const total = Math.max(0, Math.floor(value as number))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function CameraWall({ cameras = fallback }: { cameras?: CameraWallItem[] }) {
  const reducedMotion = useReducedMotion()

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cameras.map((item, index) => (
        <motion.div
          key={item.camera}
          initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`relative min-h-[148px] overflow-hidden border-2 border-fvx-navy/12 bg-fvx-cctv text-fvx-navy shadow-[4px_4px_0_#0b263a] ${item.status === 'PLAYBACK' || item.status === 'ANALYZED' ? 'ring-2 ring-fvx-teal/35 ring-offset-1' : ''}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#EAF2EF_0,#DDE7E3_70%)]" />
          <div className="ambient-grid absolute inset-0 opacity-30" />
          <RadarSweep />

          <div className="relative z-10 flex h-full flex-col justify-between p-3">
            <div className="flex items-center justify-between font-mono text-[9px] font-black uppercase tracking-[0.1em]">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 ${item.recording ? 'animate-pulse bg-fvx-red' : item.status === 'VERIFIED' || item.status === 'PLAYBACK' || item.status === 'ANALYZED' ? 'bg-fvx-green' : 'bg-fvx-teal'}`} />
                {item.recording ? 'REC' : item.status}
              </span>
              <span className="text-fvx-teal">{item.camera}</span>
            </div>

            <div>
              <div className="font-mono text-xs font-black uppercase">{item.location}</div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fvx-navy/55">
                {item.evidenceId ? `E-${String(item.evidenceId).padStart(3, '0')} / evidence mounted` : 'NO EVIDENCE MOUNTED'}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fvx-navy/55">
              <span>{item.codec || 'CODEC —'}</span>
              <span>{item.fps ? `${item.fps} FPS` : 'FPS —'}</span>
              <span>{formatDuration(item.duration) ? `${formatDuration(item.duration)} SEC` : 'DURATION —'}</span>
              {item.shaVerified && <span className="text-fvx-green">SHA-256 VERIFIED</span>}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
