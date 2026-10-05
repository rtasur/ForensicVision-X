import { CameraReplay } from './CameraReplay'

export function CCTVPlayback({
  src,
  camera = 'CAM-01',
  location = 'MAIN ENTRANCE',
}: {
  src: string
  camera?: string
  location?: string
}) {
  return <CameraReplay src={src} camera={camera} location={location} />
}
