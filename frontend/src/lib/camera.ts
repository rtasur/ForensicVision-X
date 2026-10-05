import type { CaseRecord, Evidence } from '../types'

export type CameraWallItem = {
  camera: string
  location: string
  status: 'STANDBY' | 'SOURCE SELECTED' | 'ACQUIRING' | 'VERIFIED' | 'PLAYBACK' | 'ANALYZED'
  recording: boolean
  codec?: string
  fps?: number
  duration?: number
  evidenceId?: number
  shaVerified?: boolean
}

const DEFAULT_CAMERAS = [
  { camera: 'CAM-01', location: 'MAIN ENTRANCE' },
  { camera: 'CAM-02', location: 'LOADING BAY' },
]

function getCameraId(evidence: Evidence) {
  const dvr = evidence.metadata?.dvr_metadata ?? {}
  return String(dvr.camera_id || `CAM-${String(evidence.id).padStart(2, '0')}`)
}

function getLocation(evidence: Evidence) {
  const dvr = evidence.metadata?.dvr_metadata ?? {}
  return String(dvr.location || 'UNKNOWN LOCATION')
}

function getCodec(evidence: Evidence) {
  const dvr = evidence.metadata?.dvr_metadata ?? {}
  const media = evidence.metadata?.media ?? {}
  return dvr.codec || media.codec
}

function getFps(evidence: Evidence) {
  const media = evidence.metadata?.media ?? {}
  const fps = Number(media.fps)
  return Number.isFinite(fps) ? fps : undefined
}

function getDuration(evidence: Evidence) {
  const media = evidence.metadata?.media ?? {}
  const duration = Number(media.duration)
  return Number.isFinite(duration) ? duration : undefined
}

export function buildCameraWall(caseRecord?: CaseRecord | null): CameraWallItem[] {
  const evidence = caseRecord?.evidence ?? []
  const byCamera = new Map(evidence.map((item) => [getCameraId(item), item]))

  return DEFAULT_CAMERAS.map(({ camera, location }) => {
    const item = byCamera.get(camera)
    if (!item) {
      return {
        camera,
        location,
        status: caseRecord ? 'STANDBY' : 'STANDBY',
        recording: false,
      }
    }

    const shaVerified = Boolean(item.original_hash)
    const status = item.status === 'METADATA_PARSED' ? 'VERIFIED' : 'ACQUIRING'

    return {
      camera,
      location: getLocation(item),
      status,
      recording: false,
      codec: getCodec(item),
      fps: getFps(item),
      duration: getDuration(item),
      evidenceId: item.id,
      shaVerified,
    }
  })
}

export function guessCameraName(fileName?: string) {
  if (!fileName) return 'CAM-01'
  const match = fileName.match(/cam[-_\s]?(\d+)/i)
  return match ? `CAM-${match[1].padStart(2, '0')}` : 'CAM-01'
}
