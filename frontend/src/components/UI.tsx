import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { CheckCircle2, CircleAlert, Loader2, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`overflow-hidden border-2 border-fvx-navy/12 bg-fvx-white shadow-panel ${className}`}>
      <div className="relative flex items-start justify-between gap-4 border-b-2 border-fvx-navy/10 bg-fvx-paper px-5 py-4">
        <div className="absolute inset-y-0 left-0 w-1 bg-fvx-teal" />
        <div className="pl-3">
          <h2 className="text-sm font-black uppercase tracking-[0.05em] text-fvx-navy">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-5 text-fvx-navy/55">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function StatusBadge({
  status,
  tone,
}: {
  status: string
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate'
}) {
  const styles = {
    green: 'border-fvx-green/40 bg-[#EFF8F3] text-fvx-green',
    amber: 'border-amber-600/50 bg-amber-50 text-amber-800',
    red: 'border-fvx-red/50 bg-[#FFF1EE] text-fvx-red',
    blue: 'border-fvx-teal/45 bg-[#EDF5F2] text-fvx-teal',
    slate: 'border-fvx-navy/15 bg-fvx-paper text-fvx-navy/65',
  }

  const inferred = tone ||
    (['ACCEPTED', 'ACCEPT', 'VERIFIED', 'PARSED', 'METADATA_PARSED', 'COMPLETED'].includes(status)
      ? 'green'
      : status.includes('REJECT')
        ? 'red'
        : status === 'PENDING'
          ? 'amber'
          : 'slate')

  return (
    <span className={`inline-flex items-center border-2 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${styles[inferred]}`}>
      {status}
    </span>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-fvx-navy/52">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-[10px] leading-4 text-fvx-navy/52">{hint}</span>}
    </label>
  )
}

export function Button({
  children,
  loading,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const styles = {
    primary: 'border-fvx-teal bg-fvx-teal text-white shadow-[3px_3px_0_#0B263A] hover:bg-[#346960] hover:translate-x-[1px] hover:translate-y-[1px]',
    secondary: 'border-fvx-navy/12 bg-fvx-white text-fvx-navy shadow-[3px_3px_0_#C7CAC6] hover:bg-fvx-cctv hover:border-fvx-teal/30',
    danger: 'border-fvx-red bg-[#FFF1EE] text-fvx-red shadow-[3px_3px_0_#7F1D1D] hover:bg-[#FDE5DF]',
    ghost: 'border-transparent bg-transparent text-fvx-navy/55 hover:bg-fvx-paper hover:text-fvx-navy',
  }

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`focus-ring inline-flex items-center justify-center gap-2 border-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Alert({ message, type = 'error' }: { message: string; type?: 'error' | 'success' | 'info' }) {
  const styles = {
    error: 'border-fvx-red/60 bg-[#FFF1EE] text-fvx-red',
    success: 'border-fvx-green/50 bg-[#EFF8F3] text-fvx-green',
    info: 'border-fvx-teal/45 bg-[#EDF5F2] text-fvx-teal',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 border-2 px-4 py-3 text-xs font-medium ${styles[type]}`}
    >
      {type === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <CircleAlert size={15} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </motion.div>
  )
}

export function IntegritySeal({ verified }: { verified: boolean | null }) {
  const reducedMotion = useReducedMotion()
  if (verified === null) {
    return <div className="inline-flex items-center gap-2 border-2 border-fvx-navy/12 bg-fvx-paper px-3 py-2 text-xs font-bold text-fvx-navy/65"><ShieldCheck size={15} /> Integrity not checked</div>
  }

  return (
    <motion.div
      initial={reducedMotion ? undefined : { scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center gap-2 border-2 px-3 py-2 text-xs font-bold ${verified ? 'border-fvx-green/50 bg-[#EFF8F3] text-fvx-green' : 'border-fvx-red/60 bg-[#FFF1EE] text-fvx-red'}`}
    >
      <ShieldCheck size={15} />
      Audit chain {verified ? 'verified' : 'failed'}
    </motion.div>
  )
}
