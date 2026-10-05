import { Camera } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { StatusLight } from './StatusLight'

export function CameraFrame({
  camera,
  location,
  active = false,
  hasEvidence = false,
}: {
  camera: string
  location: string
  active?: boolean
  hasEvidence?: boolean
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -3, x: 3 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden border-2 border-fvx-navy/15 bg-fvx-cctv p-4 text-fvx-navy shadow-[5px_5px_0_#0b263a] ${active ? 'ring-2 ring-fvx-teal ring-offset-2' : ''}`}
    >
      <div className="absolute inset-0 ambient-grid opacity-25" />
      <div className="relative flex items-center justify-between">
        <StatusLight status={hasEvidence ? 'VERIFIED' : 'STANDBY'} tone={hasEvidence ? 'green' : 'gray'} pulse={false} />
        <span className="font-mono text-[9px] font-black text-fvx-teal">{camera}</span>
      </div>

      <div className="relative mt-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-fvx-teal/25 bg-fvx-white text-fvx-teal">
          <Camera size={17} />
        </div>
        <div>
          <div className="text-sm font-black uppercase tracking-[0.08em]">{location}</div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-fvx-navy/45">
            {hasEvidence ? 'EVIDENCE SOURCE MOUNTED' : 'NO EVIDENCE MOUNTED'}
          </div>
        </div>
      </div>

      <div className="relative mt-8 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-fvx-navy/45">
        <span>FORENSIC CAPTURE</span>
        <span>STATE DRIVEN</span>
      </div>
    </motion.div>
  )
}
