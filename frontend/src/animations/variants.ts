import type { Variants } from 'motion/react'

export const pageEnter: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(2px)' },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.055,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.24,
      ease: 'easeOut',
    },
  },
}
