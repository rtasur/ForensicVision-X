import { Check, Circle, Loader2, ScanSearch, ShieldCheck, UploadCloud } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export type AcquisitionStage = 'idle' | 'selected' | 'uploading' | 'processing' | 'registered' | 'error'

const steps: Array<{ key: AcquisitionStage; label: string; icon: typeof UploadCloud }> = [
  { key: 'selected', label: 'Source selected', icon: UploadCloud },
  { key: 'uploading', label: 'Evidence acquired', icon: UploadCloud },
  { key: 'processing', label: 'Integrity / OEM processing', icon: ScanSearch },
  { key: 'registered', label: 'Evidence registered', icon: ShieldCheck },
]

function statusFor(step: AcquisitionStage, current: AcquisitionStage) {
  const order = ['selected', 'uploading', 'processing', 'registered']
  if (current === 'error') return 'done'
  const currentIndex = order.indexOf(current)
  const stepIndex = order.indexOf(step)
  if (currentIndex > stepIndex) return 'done'
  if (currentIndex === stepIndex) return 'active'
  return 'idle'
}

export function AcquisitionPipeline({ stage, progress }: { stage: AcquisitionStage; progress: number }) {
  const reducedMotion = useReducedMotion()
  if (stage === 'idle') return null

  return (
    <div className="mt-5 border-2 border-fvx-navy/10 bg-fvx-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fvx-teal">Acquisition pipeline</div>
          <div className="mt-1 text-xs font-bold text-fvx-navy">Evidence state transitions are shown from source selection through registration.</div>
        </div>
        <div className="font-mono text-[10px] font-black text-fvx-teal">
          {stage === 'uploading' ? `${progress}%` : stage === 'processing' ? 'SERVER' : stage === 'registered' ? 'READY' : stage === 'error' ? 'ERROR' : 'LOCAL'}
        </div>
      </div>

      {stage === 'uploading' && (
        <div className="mt-4">
          <div className="flex justify-between font-mono text-[8px] font-black uppercase tracking-[0.12em] text-fvx-navy/50">
            <span>Payload transfer</span>
            <span>SHA-256 follows on server</span>
          </div>
          <div className="mt-2 h-1.5 bg-fvx-cctv2">
            <motion.div className="h-full bg-fvx-teal" animate={{ width: `${progress}%` }} transition={{ duration: reducedMotion ? 0 : 0.12 }} />
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="mt-4 flex items-center gap-3 border-l-2 border-fvx-orange bg-[#FFF8F4] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fvx-navy/65">
          <Loader2 size={14} className={reducedMotion ? '' : 'animate-spin'} />
          Server processing: hashing, media inspection and OEM metadata parsing
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const state = statusFor(step.key, stage)
          const Icon = step.icon
          return (
            <div key={step.key} className="relative border-2 border-fvx-navy/10 bg-fvx-white p-3">
              {index < steps.length - 1 && <div className="absolute right-[-13px] top-1/2 hidden h-px w-3 bg-fvx-navy/15 md:block" />}
              <div className={`flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.1em] ${state === 'done' ? 'text-fvx-green' : state === 'active' ? 'text-fvx-teal' : 'text-fvx-navy/35'}`}>
                {state === 'done' ? <Check size={13} /> : state === 'active' ? <Icon size={13} className={step.key === 'processing' && !reducedMotion ? 'animate-pulse' : ''} /> : <Circle size={11} />}
                {step.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
