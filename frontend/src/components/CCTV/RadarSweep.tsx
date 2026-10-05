import { motion, useReducedMotion } from 'motion/react'

export function RadarSweep() {
  const reducedMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -left-1/2 top-1/2 h-0.5 w-[200%] origin-center bg-[#3E756C]/18"
        style={{ rotate: 18 }}
        animate={reducedMotion ? undefined : { x: ['-30%', '30%'] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[140%] w-[38%] -translate-x-1/2 -translate-y-1/2 origin-bottom bg-[conic-gradient(from_270deg,rgba(62,117,108,0.08),transparent_14%,transparent_100%)]"
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
