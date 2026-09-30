import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { CheckCircle2, CircleAlert, Loader2, ShieldCheck } from 'lucide-react'

export function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-slate-800 bg-slate-950/70 shadow-panel ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function StatusBadge({ status, tone }: { status: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }) {
  const styles = {
    green: 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300',
    amber: 'border-amber-900/70 bg-amber-950/40 text-amber-300',
    red: 'border-red-900/70 bg-red-950/40 text-red-300',
    blue: 'border-sky-900/70 bg-sky-950/40 text-sky-300',
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
  }
  const inferred = tone || (['ACCEPTED', 'ACCEPT', 'VERIFIED', 'PARSED', 'METADATA_PARSED', 'COMPLETED'].includes(status) ? 'green' : status.includes('REJECT') ? 'red' : status === 'PENDING' ? 'amber' : 'slate')
  return <span className={`inline-flex items-center rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${styles[inferred]}`}>{status}</span>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[10px] text-slate-600">{hint}</span>}
    </label>
  )
}

export function Button({ children, loading, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'border-sky-600 bg-sky-700 text-white hover:bg-sky-600',
    secondary: 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800',
    danger: 'border-red-800 bg-red-950/40 text-red-300 hover:bg-red-900/50',
    ghost: 'border-transparent bg-transparent text-slate-300 hover:bg-slate-900',
  }
  return (
    <button {...props} disabled={loading || props.disabled} className={`focus-ring inline-flex items-center justify-center gap-2 border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Alert({ message, type = 'error' }: { message: string; type?: 'error' | 'success' | 'info' }) {
  const styles = {
    error: 'border-red-900/70 bg-red-950/30 text-red-300',
    success: 'border-emerald-900/70 bg-emerald-950/30 text-emerald-300',
    info: 'border-sky-900/70 bg-sky-950/30 text-sky-300',
  }
  return (
    <div className={`flex items-start gap-2 border px-3 py-2.5 text-xs ${styles[type]}`}>
      {type === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <CircleAlert size={15} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}

export function IntegritySeal({ verified }: { verified: boolean | null }) {
  if (verified === null) return <div className="inline-flex items-center gap-2 border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-500"><ShieldCheck size={15} /> Integrity not checked</div>
  return <div className={`inline-flex items-center gap-2 border px-3 py-2 text-xs ${verified ? 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300' : 'border-red-900/70 bg-red-950/40 text-red-300'}`}><ShieldCheck size={15} /> Audit chain {verified ? 'verified' : 'failed'}</div>
}
