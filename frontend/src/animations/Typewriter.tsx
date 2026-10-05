import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

export function Typewriter({
  text,
  speed = 45,
  cursor = true,
}: {
  text: string
  speed?: number
  cursor?: boolean
}) {
  const [visible, setVisible] = useState('')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      setVisible(text)
      return
    }

    setVisible('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setVisible(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, speed)

    return () => window.clearInterval(timer)
  }, [text, speed, reducedMotion])

  return (
    <span>
      {visible}
      {cursor && <span className="telemetry-cursor text-fvx-teal">_</span>}
    </span>
  )
}
