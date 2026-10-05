export function AmbientGrid({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`ambient-grid-layer pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
    >
      {/* Restores the original forensic grid animation and keeps it visible
          behind the new procedural gradient atmosphere. */}
      <div className="ambient-grid absolute inset-0" />

      {/* Soft vertical gradient fields inspired by the supplied reference. */}
      <div className="ambient-gradient-field ambient-gradient-a" />
      <div className="ambient-gradient-field ambient-gradient-b" />
      <div className="ambient-gradient-field ambient-gradient-c" />
      <div className="ambient-gradient-field ambient-gradient-d" />
      <div className="ambient-gradient-field ambient-gradient-e" />
      <div className="ambient-gradient-field ambient-gradient-f" />

      <div className="ambient-haze absolute inset-[-12%]" />
      <div className="ambient-sweep absolute left-[-30%] top-[-20%] h-[140%] w-[28%]" />
      <div className="ambient-vignette absolute inset-0" />
    </div>
  )
}
