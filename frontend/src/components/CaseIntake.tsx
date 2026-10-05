import { useEffect, useMemo, useRef, useState } from 'react'
import { FilePlus2, FileUp, Link2, ShieldCheck, UploadCloud, Video } from 'lucide-react'
import { motion } from 'motion/react'
import type { CaseRecord } from '../types'
import { api } from '../lib/api'
import { guessCameraName, buildCameraWall } from '../lib/camera'
import { Reveal } from '../animations/Reveal'
import { Telemetry } from '../animations/Telemetry'
import { Alert, Button, Field, Panel } from './UI'
import { AcquisitionPipeline, type AcquisitionStage } from './AcquisitionPipeline'
import { CameraReplay } from './CCTV/CameraReplay'
import { CameraWall } from './CCTV/CameraWall'

const MAX_UI_BYTES = 500 * 1024 * 1024

type Message = { text: string; type: 'error' | 'success' | 'info' }

export function CaseIntake({
  caseId,
  caseRecord,
  onCaseCreated,
  onReload,
}: {
  caseId: number | null
  caseRecord?: CaseRecord | null
  onCaseCreated: (id: number) => void | Promise<void>
  onReload: () => Promise<void>
}) {
  const [caseName, setCaseName] = useState('Warehouse Intrusion - Phase 2')
  const [examinerName, setExaminerName] = useState('YOKAI-EXAM-01')
  const [creating, setCreating] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [stage, setStage] = useState<AcquisitionStage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState<Message | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pairText = useMemo(() => {
    if (!videoFile && !jsonFile) return 'No evidence selected'
    if (videoFile && jsonFile) return `${videoFile.name} + ${jsonFile.name}`
    return videoFile?.name || jsonFile?.name || ''
  }, [videoFile, jsonFile])

  const cameraName = guessCameraName(videoFile?.name)
  const cameraLocation = caseRecord?.evidence.find((e) => {
    const camera = String(e.metadata?.dvr_metadata?.camera_id || '')
    return camera === cameraName
  })?.metadata?.dvr_metadata?.location || 'LOCAL EVIDENCE SOURCE'

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  function setSelectedVideo(file: File | null) {
    setVideoFile(file)
    setStage(file ? 'selected' : 'idle')
    setVideoUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return file ? URL.createObjectURL(file) : null
    })
  }

  function inspectFiles(files: File[]) {
    let video = videoFile
    let json = jsonFile
    for (const file of files) {
      const name = file.name.toLowerCase()
      if (['.mp4', '.avi', '.mkv', '.mov'].some((ext) => name.endsWith(ext))) video = file
      else if (name.endsWith('.json')) json = file
    }
    if (video !== videoFile) setSelectedVideo(video)
    setJsonFile(json)
    if (video) setStage('selected')
    setMessage(null)
  }

  async function createCase() {
    if (!caseName.trim() || !examinerName.trim()) {
      setMessage({ text: 'Case name and examiner name are required.', type: 'info' })
      return
    }

    setCreating(true)
    setMessage(null)
    try {
      const record: CaseRecord = await api.createCase(caseName.trim(), examinerName.trim())
      await onCaseCreated(record.id)
      setMessage({ text: `Case ${record.id} created and assigned to ${record.examiner_name}.`, type: 'success' })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to create case.', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  async function uploadEvidence() {
    if (!caseId) {
      setMessage({ text: 'Load or create a case before uploading evidence.', type: 'info' })
      return
    }
    if (!videoFile) {
      setMessage({ text: 'Select a video evidence file first.', type: 'info' })
      return
    }
    if (videoFile.size > MAX_UI_BYTES || (jsonFile && jsonFile.size > MAX_UI_BYTES)) {
      setMessage({ text: 'Selected file exceeds the 500 MB backend limit.', type: 'error' })
      setStage('error')
      return
    }

    setMessage(null)
    setUploadProgress(0)
    setStage('uploading')

    try {
      const result = await api.uploadEvidenceWithProgress(
        caseId,
        videoFile,
        jsonFile,
        (progress) => {
          setUploadProgress(progress)
          if (progress >= 100) setStage('processing')
        },
      )

      setStage('processing')
      await onReload()
      setStage('registered')

      const sha = result?.evidence?.sha256 || ''
      setMessage({
        text: `Evidence registered. ${sha ? `SHA-256 ${sha}` : 'Integrity hash computed'}; status ${result?.evidence?.status || 'METADATA_PARSED'}.`,
        type: 'success',
      })
    } catch (error) {
      setStage('error')
      setMessage({ text: error instanceof Error ? error.message : 'Evidence acquisition failed.', type: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-fvx-navy/10 pb-5">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-fvx-teal">01 / Acquisition / Chain of custody begins here</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-fvx-navy">Case Intake</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-fvx-navy/55">Register the investigation, preserve examiner identity, and acquire CCTV evidence with sidecar metadata.</p>
          </div>
          <Telemetry camera={caseId ? `CASE-${caseId}` : 'NEW CASE'} status={caseId ? 'READY FOR ACQUISITION' : 'REGISTRATION'} recording={false} state="STANDBY" />
        </div>
      </Reveal>

      {message && <Alert message={message.text} type={message.type} />}

      <Reveal delay={0.05}>
        <div className="border-2 border-fvx-navy/12 bg-fvx-white p-4 shadow-[5px_5px_0_#0b263a]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fvx-teal">Surveillance channel matrix</div>
            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-fvx-navy/45">CAM-01 / CAM-02 · state driven</div>
          </div>
          <CameraWall cameras={buildCameraWall(caseRecord)} />
        </div>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Reveal direction="left">
          <Panel title="Case registration" subtitle="The examiner identity is stored with the case record.">
            <div className="space-y-4">
              <Field label="Case name">
                <input value={caseName} onChange={(e) => setCaseName(e.target.value)} className="focus-ring w-full border-2 border-fvx-navy/12 bg-fvx-white px-3 py-2.5 text-sm font-bold text-fvx-navy" />
              </Field>
              <Field label="Examiner name" hint="Forensic display identity; authenticated owner is derived from the JWT session.">
                <input value={examinerName} onChange={(e) => setExaminerName(e.target.value)} className="focus-ring w-full border-2 border-fvx-navy/12 bg-fvx-white px-3 py-2.5 font-mono text-sm font-bold text-fvx-navy" />
              </Field>
              <div className="grid grid-cols-2 border-2 border-fvx-navy/10 bg-[#F8F5EC]">
                <div className="border-r border-fvx-navy/10 p-3"><div className="font-mono text-[9px] uppercase text-fvx-navy/45">Identity</div><div className="mt-1 text-xs font-black text-fvx-navy">{examinerName}</div></div>
                <div className="p-3"><div className="font-mono text-[9px] uppercase text-fvx-navy/45">Status</div><div className="mt-1 text-xs font-black text-fvx-green">{caseId ? 'ACTIVE' : 'READY'}</div></div>
              </div>
              <Button onClick={createCase} loading={creating} className="w-full"><FilePlus2 size={15} /> Create case</Button>
            </div>
          </Panel>
        </Reveal>

        <Reveal direction="right" delay={0.08}>
          <Panel title="CCTV evidence acquisition" subtitle="Accepted video: MP4, AVI, MKV, MOV. Optional metadata: JSON.">
            <input ref={inputRef} type="file" multiple accept=".mp4,.avi,.mkv,.mov,.json,video/*,application/json" className="hidden" onChange={(e) => inspectFiles(Array.from(e.target.files || []))} />

            <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); inspectFiles(Array.from(e.dataTransfer.files)) }}
                  onClick={() => inputRef.current?.click()}
                  className={`group cursor-pointer border-2 border-dashed px-6 py-10 text-center transition ${dragging ? 'border-fvx-teal bg-[#EEF5F2]' : 'border-fvx-navy/12 bg-fvx-white hover:border-fvx-teal/60 hover:bg-[#EEF5F2]/60'}`}
                >
                  <motion.div animate={dragging ? { y: [-2, 2, -2] } : undefined} transition={{ duration: 0.7, repeat: Infinity }}><UploadCloud size={26} className="mx-auto text-fvx-teal" /></motion.div>
                  <div className="mt-3 text-sm font-black uppercase text-fvx-navy">Drop evidence files</div>
                  <div className="mt-1 text-xs text-fvx-navy/55">Select one CCTV video and one JSON sidecar.</div>
                  <div className="mt-4 font-mono text-[9px] uppercase tracking-wider text-fvx-navy/40">500 MB maximum per file</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="border-2 border-fvx-navy/10 bg-fvx-white p-3"><div className="text-[9px] font-black uppercase tracking-[0.12em] text-fvx-navy/45">Video evidence</div><div className="mt-2 flex items-center gap-2 text-xs font-bold text-fvx-navy"><FileUp size={14} className="text-fvx-teal" />{videoFile?.name || 'Not selected'}</div>{videoFile && <div className="mt-1 font-mono text-[10px] text-fvx-navy/45">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</div>}</div>
                  <div className="border-2 border-fvx-navy/10 bg-fvx-white p-3"><div className="text-[9px] font-black uppercase tracking-[0.12em] text-fvx-navy/45">JSON sidecar</div><div className="mt-2 flex items-center gap-2 text-xs font-bold text-fvx-navy"><Link2 size={14} className="text-fvx-teal" />{jsonFile?.name || 'Optional'}</div>{jsonFile && <div className="mt-1 font-mono text-[10px] text-fvx-navy/45">{(jsonFile.size / 1024).toFixed(1)} KB</div>}</div>
                </div>
              </div>

              <div>
                {videoUrl ? (
                  <CameraReplay src={videoUrl} camera={cameraName} location={cameraLocation} />
                ) : (
                  <div className="flex aspect-video items-center justify-center border-2 border-fvx-navy/10 bg-fvx-cctv text-center">
                    <div><Video size={28} className="mx-auto text-fvx-teal/60" /><div className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-fvx-navy/55">Evidence preview unavailable</div></div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t-2 border-fvx-navy/10 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 text-[10px] text-fvx-navy/55">Selection: <span className="font-mono text-fvx-navy">{pairText}</span></div>
                <Button onClick={uploadEvidence} loading={stage === 'uploading' || stage === 'processing'} disabled={!videoFile || !caseId || stage === 'registered'}><UploadCloud size={15} /> Acquire evidence</Button>
              </div>

              <AcquisitionPipeline stage={stage} progress={uploadProgress} />

              {videoFile && stage === 'selected' && <div className="mt-4 flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-wider text-fvx-green"><ShieldCheck size={14} /> Local evidence loaded / ready for secure acquisition</div>}
              {stage === 'registered' && <div className="mt-4 flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-wider text-fvx-green"><ShieldCheck size={14} /> Evidence registered / backend state synchronized</div>}
              {stage === 'error' && <div className="mt-4 border-l-2 border-fvx-red bg-[#FFF1EE] px-3 py-2 font-mono text-[9px] font-black uppercase text-fvx-red">Acquisition failed. Resolve the error above and retry.</div>}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}
