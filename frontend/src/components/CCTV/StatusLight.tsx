export function StatusLight({
  status = 'ONLINE',
  tone = 'green',
  pulse = false,
}: {
  status?: string
  tone?: 'green' | 'orange' | 'red' | 'cyan' | 'gray'
  pulse?: boolean
}) {
  const tones = {
    green: 'bg-fvx-green text-fvx-green',
    orange: 'bg-fvx-orange text-fvx-orange',
    red: 'bg-fvx-red text-fvx-red',
    cyan: 'bg-fvx-teal text-fvx-teal',
    gray: 'bg-fvx-navy/35 text-fvx-navy/60',
  }

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.1em] ${tones[tone]}`}>
      <span className={`h-2 w-2 ${tones[tone].split(' ')[0]} ${pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}
