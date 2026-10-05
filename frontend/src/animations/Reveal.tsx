import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  duration = 1.15,
}: {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: number
}) {
  const reduceMotion = useReducedMotion()

  const offsets = {
    up: { y: 42 },
    down: { y: -42 },
    left: { x: 42 },
    right: { x: -42 },
  }

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 0, ...offsets[direction] }
      }
      whileInView={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, x: 0, y: 0 }
      }
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
