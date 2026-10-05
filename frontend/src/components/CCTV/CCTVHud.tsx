import { useEffect, useState } from 'react'

export type CCTVState = 'PLAYBACK' | 'ANALYZED' | 'STANDBY' | 'LIVE'

function formatPlayback(seconds: number) {
  const safe = Math.max(0, seconds)
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = Math.floor(safe % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CCTVHud({
  camera = 'CAM-01',
  location = 'MAIN ENTRANCE',
  state,
  playbackTime,
  frame,
  recording,
  source,
  timestamp,
}: {
  camera?: string
  location?: string
  state?: CCTVState
  playbackTime?: number
  frame?: number
  // Legacy props retained for compatibility with older CCTV components.
  recording?: boolean
  source?: string
  timestamp?: string
}) {
  const [now, setNow] = useState(new Date())

  const resolvedState: CCTVState =
    state || (recording ? 'LIVE' : 'STANDBY')

  useEffect(() => {
    if (timestamp || playbackTime !== undefined) return
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [timestamp, playbackTime])

  const displayTime =
    timestamp ||
    (playbackTime !== undefined
      ? formatPlayback(playbackTime)
      : now.toLocaleString('en-IN', { hour12: false }))

  const stateLabel =
    resolvedState === 'PLAYBACK'
      ? 'PLAYBACK'
      : resolvedState === 'ANALYZED'
        ? 'ANALYZED'
        : resolvedState === 'LIVE'
          ? 'REC'
          : 'STANDBY'

  const sourceLabel =
    source ||
    (resolvedState === 'PLAYBACK'
      ? 'LOCAL EVIDENCE REPLAY'
      : resolvedState === 'ANALYZED'
        ? 'FORENSIC ANALYSIS'
        : resolvedState === 'LIVE'
          ? 'LIVE CAPTURE'
          : 'FORENSIC STANDBY')

  const signalLabel =
    resolvedState === 'PLAYBACK'
      ? 'PLAYBACK / EVIDENCE MOUNTED'
      : resolvedState === 'ANALYZED'
        ? 'ANALYSIS FRAME / PROTECTED'
        : resolvedState === 'LIVE'
          ? 'SIGNAL STABLE / LIVE SOURCE'
          : 'NO EVIDENCE MOUNTED'

  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono">
      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-3 border border-[#0B263A]/20 bg-[#F4F1E8]/94 px-3 py-2 text-[10px] font-bold tracking-[0.08em] text-[#0B263A] shadow-sm backdrop-blur-sm">
        <span
          className={`h-2 w-2 ${
            resolvedState === 'LIVE' || recording
              ? 'animate-pulse bg-[#C94A3A]'
              : 'bg-[#7A8A8A]'
          }`}
        />
        <span>{stateLabel}</span>
        <span className="text-[#3E756C]">{camera}</span>
        <span className="text-[#0B263A]/35">|</span>
        <span className="text-[#0B263A]/70">{location}</span>
        {frame !== undefined && (
          <>
            <span className="text-[#0B263A]/35">|</span>
            <span className="text-[#3E756C]">FR {frame}</span>
          </>
        )}
      </div>

      <div className="absolute right-4 top-4 border border-[#0B263A]/20 bg-[#F4F1E8]/94 px-3 py-2 text-[10px] font-bold text-[#3E756C] shadow-sm backdrop-blur-sm">
        {sourceLabel}
      </div>

      <div className="absolute bottom-4 left-4 border border-[#0B263A]/20 bg-[#F4F1E8]/94 px-3 py-2 text-[9px] uppercase tracking-[0.08em] text-[#0B263A]/70 shadow-sm backdrop-blur-sm">
        {signalLabel}
      </div>

      <div className="absolute bottom-4 right-4 border border-[#0B263A]/20 bg-[#F4F1E8]/94 px-3 py-2 text-[9px] font-bold text-[#0B263A] shadow-sm backdrop-blur-sm">
        {displayTime}
      </div>

      <span className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-[#4F8B80]" />
      <span className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-[#4F8B80]" />
      <span className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#4F8B80]" />
      <span className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[#4F8B80]" />
    </div>
  )
}
