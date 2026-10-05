import { useMemo, useState } from 'react'
import { CheckCircle2, FileVideo2, RefreshCw, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { CaseRecord } from '../types'
import { Reveal } from '../animations/Reveal'
import { Button, Panel, StatusBadge } from './UI'
import { EvidenceDetails } from './EvidenceDetails'

export function EvidenceAnalysis({ caseRecord, onRefresh }: { caseRecord: CaseRecord | null; onRefresh: () => Promise<void> }) {
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null)

  const verifiedCount = useMemo(
    () => caseRecord?.evidence.filter((e) => Boolean(e.original_hash)).length ?? 0,
    [caseRecord],
  )

  const vendorCount = useMemo(() => {
    if (!caseRecord) return 0
    const vendors = new Set(caseRecord.evidence.map((e) => e.metadata?.oem?.profile_id || e.metadata?.oem?.vendor || 'GENERIC'))
    return vendors.size
  }, [caseRecord])

  if (!caseRecord) return <Empty title="Evidence Analysis" text="Load an active case to inspect acquired evidence." />

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-fvx-navy/10 pb-5">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fvx-teal">02 / Evidence / integrity register</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-fvx-navy">Evidence Analysis</h1>
            <p className="mt-2 text-xs text-fvx-navy/55">Inspect acquired evidence as structured forensic objects with OEM, media, temporal and integrity context.</p>
          </div>
          <Button variant="secondary" onClick={onRefresh}><RefreshCw size={14} /> Refresh case</Button>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Case" value={`#${caseRecord.id}`} />
          <Stat label="Evidence objects" value={String(caseRecord.evidence.length).padStart(2, '0')} />
          <Stat label="Integrity records" value={`${String(verifiedCount).padStart(2, '0')} / SHA-256`} tone="green" />
          <Stat label="OEM profiles" value={String(vendorCount).padStart(2, '0')} />
        </div>
      </Reveal>

      <Reveal delay={0.24}>
        <Panel title="Acquired evidence" subtitle={`${caseRecord.evidence.length} item(s) registered under Case ${caseRecord.id}. Select a record to inspect its forensic metadata.`}>
          {caseRecord.evidence.length === 0 ? (
            <div className="border-2 border-dashed border-fvx-navy/12 px-5 py-12 text-center text-xs text-fvx-navy/55">No evidence registered for this case.</div>
          ) : (
            <div className="overflow-x-auto border-2 border-fvx-navy/10">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-fvx-navy/10 bg-fvx-navy text-[9px] font-black uppercase tracking-[0.12em] text-white">
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">File</th>
                    <th className="px-3 py-3">Vendor profile</th>
                    <th className="px-3 py-3">Camera</th>
                    <th className="px-3 py-3">SHA-256</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {caseRecord.evidence.map((e, index) => {
                    const oem = e.metadata?.oem || {}
                    const dvr = e.metadata?.dvr_metadata || {}
                    const camera = dvr.camera_id || `CAM-${String(e.id).padStart(2, '0')}`
                    const expanded = expandedEvidence === e.id

                    return (
                      <AnimatePresence key={e.id} initial={false}>
                        <motion.tr
                          key={`row-${e.id}`}
                          initial={{ opacity: 0, x: -18 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, amount: 0.2 }}
                          transition={{ duration: 0.65, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => setExpandedEvidence(expanded ? null : e.id)}
                          className={`cursor-pointer border-b-2 border-fvx-navy/10 transition ${expanded ? 'bg-[#EEF5F2]' : 'bg-fvx-white hover:bg-fvx-paper'}`}
                        >
                          <td className="px-3 py-4 font-mono text-xs text-fvx-navy/55">E-{String(e.id).padStart(3, '0')}</td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-xs font-black text-fvx-navy"><FileVideo2 size={14} className="text-fvx-teal" /> {e.filename}</div>
                            <div className="mt-1 font-mono text-[9px] uppercase text-fvx-navy/45">Clock offset {e.clock_offset >= 0 ? '+' : ''}{e.clock_offset}s</div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-semibold text-fvx-navy">{oem.vendor || 'Unknown'}</div>
                            <div className="mt-1 font-mono text-[9px] text-fvx-navy/45">{oem.profile_id || 'GENERIC_V1'}</div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="font-mono text-xs font-black text-fvx-teal">{camera}</div>
                            <div className="mt-1 text-[9px] uppercase text-fvx-navy/45">{dvr.location || 'Unknown location'}</div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex min-w-[300px] items-start gap-2">
                              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-fvx-green" />
                              <div>
                                <div className="font-mono text-[10px] leading-4 break-all text-fvx-navy">{e.original_hash}</div>
                                <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fvx-green">Recorded / SHA-256</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4"><StatusBadge status={e.status} /></td>
                        </motion.tr>

                        {expanded && (
                          <motion.tr
                            key={`details-${e.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td colSpan={6} className="p-0">
                              <EvidenceDetails evidence={e} />
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Reveal>

      <div className="flex items-center gap-3 border-l-4 border-fvx-green bg-[#EFF8F3] px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-fvx-green">
        <ShieldCheck size={15} /> Integrity state shown above reflects the backend evidence record.
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <div className="border-2 border-fvx-navy/10 bg-fvx-white p-4 shadow-[3px_3px_0_#c7cac6]">
      <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-fvx-navy/50">{label}</div>
      <div className={`mt-2 font-mono text-sm font-black ${tone === 'green' ? 'text-fvx-green' : 'text-fvx-navy'}`}>{value}</div>
    </div>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="border-b-2 border-fvx-navy/10 pb-5"><div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fvx-teal">02 / Evidence</div><h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-fvx-navy">{title}</h1></div>
      <div className="border-2 border-dashed border-fvx-navy/12 bg-fvx-white px-5 py-16 text-center text-xs text-fvx-navy/55">{text}</div>
    </div>
  )
}
