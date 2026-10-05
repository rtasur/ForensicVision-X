export function Scanline() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="cctv-scanline absolute left-0 right-0 h-[2px] bg-[#3E756C]/18" />

      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(11,38,58,0.022)_0px,rgba(11,38,58,0.022)_1px,transparent_1px,transparent_4px)]" />
    </div>
  )
}