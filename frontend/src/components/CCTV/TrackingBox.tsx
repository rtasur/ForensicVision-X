import { motion, useReducedMotion } from 'motion/react'

export function TrackingBox({
  x,
  y,
  width,
  height,
  label,
  confidence,
}: {
  x: number
  y: number
  width: number
  height: number
  label: string
  confidence: number
}) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.3 }}
      className="absolute z-40 border-2 border-[#4F8B80]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      <div className="absolute -top-6 left-[-2px] bg-[#9FC2B9] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#0B263A]">
        {label} {(confidence * 100).toFixed(1)}%
      </div>
      <span className="absolute -left-[2px] -top-[2px] h-3 w-3 border-l-2 border-t-2 border-[#86ACA2]" />
      <span className="absolute -right-[2px] -top-[2px] h-3 w-3 border-r-2 border-t-2 border-[#86ACA2]" />
      <span className="absolute -bottom-[2px] -left-[2px] h-3 w-3 border-b-2 border-l-2 border-[#86ACA2]" />
      <span className="absolute -bottom-[2px] -right-[2px] h-3 w-3 border-b-2 border-r-2 border-[#86ACA2]" />
    </motion.div>
  )
}
