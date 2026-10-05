import { useEffect } from 'react'
import { CheckCircle2, Loader2, ShieldCheck, Video } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Typewriter } from '../animations/Typewriter'
import { ScrambleText } from '../animations/ScrambleText'

const checks = [
  ['CAMERA INTERFACE', Video],
  ['EVIDENCE ENGINE', CheckCircle2],
  ['AI TRIAGE', CheckCircle2],
  ['AUDIT CHAIN', ShieldCheck],
] as const

export function SystemBoot({ onComplete }: { onComplete: () => void }) {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const timer = window.setTimeout(onComplete, reducedMotion ? 120 : 1250)
    return () => window.clearTimeout(timer)
  }, [onComplete, reducedMotion])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F1E8] text-[#0B263A]">
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-[min(520px,calc(100vw-32px))] border-2 border-[#3E756C]/40 bg-[#FFFDF8]/96 p-7 shadow-[10px_10px_0_rgba(230,90,51,0.35)]"
      >
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#3E756C]">
          ForensicVision-X
        </div>
        <div className="mt-2 font-mono text-xs text-fvx-navy/50"><ScrambleText text="SYSTEM INITIALIZATION" /></div>

        <div className="mt-8 text-lg font-black uppercase tracking-[0.04em]">
          <Typewriter text="CONTROLLED CCTV EVIDENCE PROCESSING" speed={18} />
        </div>

        <div className="mt-6 h-1.5 overflow-hidden bg-[#0B263A]/08"><motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: reducedMotion ? 0.05 : 1.0, ease: 'easeInOut' }} className="h-full bg-[#3E756C]" /></div>

        <div className="mt-7 space-y-3">
          {checks.map(([label, Icon], index) => (
            <motion.div
              key={label}
              initial={reducedMotion ? undefined : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reducedMotion ? 0 : index * 0.11 }}
              className="flex items-center justify-between border-b border-[#0B263A]/12 pb-2 font-mono text-[10px]"
            >
              <span className="text-[#0B263A]/55">{label}</span>
              <span className="flex items-center gap-2 text-[#2F7D60]">
                <Icon size={13} /> OK
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-7 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#3E756C]">
          <Loader2 size={12} className={reducedMotion ? '' : 'animate-spin'} />
          System ready
        </div>
      </motion.div>
    </div>
  )
}
