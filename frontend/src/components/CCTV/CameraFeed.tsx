import { CCTVHud } from './CCTVHud'
import { Scanline } from './Scanline'

export function CameraFeed({
  src,
  camera = 'CAM-01',
  location = 'MAIN ENTRANCE',
}: {
  src?: string
  camera?: string
  location?: string
}) {
  return (
    <div className="relative aspect-video overflow-hidden border-2 border-[#0b263a] bg-[#DDE7E3] shadow-[6px_6px_0_#0b263a]">
      {src ? (
        <img
          src={src}
          alt={`${camera} forensic frame`}
          className="cctv-screen h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,#EAF2EF_0,#DDE7E3_68%)]">
          <div className="text-center">
            <div className="font-mono text-2xl font-black tracking-[0.12em] text-[#3E756C]">
              NO SIGNAL
            </div>
            <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#0B263A]/55">
              Evidence source not mounted
            </div>
          </div>
        </div>
      )}
      <Scanline />
      <CCTVHud camera={camera} location={location} />
    </div>
  )
}
