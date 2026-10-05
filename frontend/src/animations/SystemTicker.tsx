import { motion, useReducedMotion } from 'motion/react'

export function SystemTicker({ text }: { text: string }) {
  const reducedMotion = useReducedMotion()
  return (
    <div className="overflow-hidden border-y border-fvx-navy/10 bg-fvx-paper py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-fvx-navy/55">
      <motion.div
        className="flex min-w-max gap-12 whitespace-nowrap"
        animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 bg-fvx-teal" />
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
