import type { ReactNode } from 'react'
import { Fingerprint, Gauge, MapPin, Timer, Video } from 'lucide-react'
import type { Evidence } from '../types'

function displayNumber(value: unknown, suffix = '') {
  const number = Number(value)
  return Number.isFinite(number) ? `${number}${suffix}` : '—'
}

export function EvidenceDetails({ evidence }: { evidence: Evidence }) {
  const dvr = evidence.metadata?.dvr_metadata ?? {}
  const oem = evidence.metadata?.oem ?? {}
  const media = evidence.metadata?.media ?? {}
  const temporal = evidence.metadata?.temporal ?? {}

  return (
    <div className="grid gap-3 border-t-2 border-fvx-navy/10 bg-fvx-paper p-4 md:grid-cols-2 xl:grid-cols-5">
      <Detail icon={MapPin} label="Camera / location">
        <strong>{dvr.camera_id || '—'}</strong>
        <span>{dvr.location || 'Unknown location'}</span>
      </Detail>
      <Detail icon={Video} label="Media">
        <strong>{displayNumber(media.width)} × {displayNumber(media.height)}</strong>
        <span>{displayNumber(media.fps, ' FPS')} · {displayNumber(media.frame_count, ' frames')}</span>
      </Detail>
      <Detail icon={Timer} label="Duration / time">
        <strong>{displayNumber(media.duration, ' sec')}</strong>
        <span>Clock offset {Number(temporal.clock_offset ?? evidence.clock_offset) >= 0 ? '+' : ''}{Number(temporal.clock_offset ?? evidence.clock_offset)}s</span>
      </Detail>
      <Detail icon={Gauge} label="OEM profile">
        <strong>{oem.vendor || dvr.vendor || 'Unknown'}</strong>
        <span>{oem.profile_id || 'GENERIC'}</span>
      </Detail>
      <Detail icon={Fingerprint} label="Integrity">
        <strong className="text-fvx-green">SHA-256 recorded</strong>
        <span className="break-all font-mono">{evidence.original_hash}</span>
      </Detail>
    </div>
  )
}

function Detail({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border border-fvx-navy/10 bg-fvx-white p-3">
      <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.1em] text-fvx-teal"><Icon size={11} /> {label}</div>
      <div className="mt-3 space-y-1 text-[10px] text-fvx-navy/55 [&_strong]:block [&_strong]:text-xs [&_strong]:font-black [&_strong]:text-fvx-navy">{children}</div>
    </div>
  )
}
