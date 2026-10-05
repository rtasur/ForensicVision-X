import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_'

export function ScrambleText({
  text,
  speed = 28,
}: {
  text: string
  speed?: number
}) {
  const [value, setValue] = useState(text)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      setValue(text)
      return
    }

    let frame = 0
    const total = text.length * 2

    const timer = window.setInterval(() => {
      frame += 1
      const progress = Math.min(frame / total, 1)
      const locked = Math.floor(progress * text.length)

      setValue(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < locked) return char
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          })
          .join(''),
      )

      if (progress >= 1) {
        window.clearInterval(timer)
        setValue(text)
      }
    }, speed)

    return () => window.clearInterval(timer)
  }, [text, speed, reducedMotion])

  return <span>{value}</span>
}
