import { useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { CCTVHud } from './CCTVHud'
import { Scanline } from './Scanline'

function formatTime(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = Math.floor(safe % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CameraReplay({
  src,
  camera = 'CAM-01',
  location = 'EVIDENCE REPLAY',
}: {
  src: string
  camera?: string
  location?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(true)
  const reducedMotion = useReducedMotion()

  async function toggle() {
    const video = videoRef.current
    if (!video) return
    try {
      if (video.paused) await video.play()
      else video.pause()
    } catch {
      setPlaying(false)
    }
  }

  function seek(value: number) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value
    setCurrent(value)
  }

  const percentage = duration ? (current / duration) * 100 : 0

  return (
    <div className="relative overflow-hidden border-2 border-fvx-navy/12 bg-fvx-cctv shadow-[6px_6px_0_#0b263a]">
      <div className="relative aspect-video cctv-noise">
        <video
          ref={videoRef}
          src={src}
          muted={muted}
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="cctv-screen h-full w-full object-contain bg-fvx-cctv"
          aria-label={`${camera} evidence replay`}
        />

        <Scanline />
        <CCTVHud camera={camera} location={location} state="PLAYBACK" playbackTime={current} />
      </div>

      <div className="border-t-2 border-fvx-navy/12 bg-fvx-paper px-4 py-3">
        <div className="mb-2 flex justify-between font-mono text-[8px] uppercase tracking-wider text-fvx-navy/50">
          <span>REPLAY TIME</span>
          <span>{formatTime(current)} / {formatTime(duration)}</span>
        </div>

        <div className="h-1.5 bg-fvx-cctv2">
          <motion.div
            className="h-full bg-fvx-teal"
            animate={{ width: `${percentage}%` }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.08 }}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center border-2 border-fvx-teal/60 bg-fvx-white text-fvx-teal hover:bg-fvx-cctv"
            aria-label={playing ? 'Pause evidence playback' : 'Play evidence playback'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <input
            aria-label="Evidence playback position"
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={current}
            onChange={(event) => seek(Number(event.target.value))}
            className="min-w-0 flex-1 accent-[#3E756C]"
          />

          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center border-2 border-fvx-navy/12 bg-fvx-white text-fvx-navy/60 hover:bg-fvx-cctv"
            aria-label={muted ? 'Unmute evidence playback' : 'Mute evidence playback'}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-fvx-navy/45">
          <span>LOCAL EVIDENCE REPLAY</span>
          <span>MP4 SOURCE · FORENSIC PLAYBACK</span>
        </div>
      </div>
    </div>
  )
}
