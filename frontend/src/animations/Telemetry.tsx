import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type TelemetryProps = {
  camera?: string
  status?: string
  mode?: string
  recording?: boolean
  state?: 'PLAYBACK' | 'ANALYZED' | 'STANDBY' | 'LIVE'
  playbackTime?: number
  frame?: number
  source?: string
  timestamp?: string
}

export function Telemetry({
  camera = 'CAM-01',
  status = 'MONITORING',
  mode,
  recording = false,
  state,
  playbackTime,
  frame,
  source,
  timestamp,
}: TelemetryProps) {
  const [now, setNow] = useState(new Date())
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const effectiveMode = state ?? mode ?? (recording ? 'LIVE' : 'STANDBY')
  const effectiveStatus = status || effectiveMode
  const timeLabel = timestamp
    ? timestamp
    : typeof playbackTime === 'number'
      ? new Date(playbackTime * 1000).toISOString().slice(11, 19)
      : now.toLocaleTimeString('en-IN', { hour12: false })

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.12em]">
      <motion.span
        animate={
          reducedMotion || !recording
            ? undefined
            : { opacity: [1, 0.35, 1] }
        }
        transition={{ duration: 1.3, repeat: Infinity }}
        className={`flex items-center gap-2 ${recording ? 'text-red-700' : 'text-slate-500'}`}
      >
        <span
          className={`h-2 w-2 ${recording ? 'bg-red-600' : 'bg-slate-400'}`}
        />
        {recording ? 'REC' : effectiveMode}
      </motion.span>

      <span className="text-[#3E756C]">{camera}</span>
      <span className="text-slate-500">{effectiveStatus}</span>
      {frame !== undefined && (
        <span className="text-slate-500">FRAME {frame}</span>
      )}
      {source && <span className="text-slate-500">{source}</span>}
      <span className="text-slate-400">{timeLabel}</span>
    </div>
  )
}
