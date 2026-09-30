import { useMemo, useRef, useState } from 'react'
import { FilePlus2, FileUp, Link2, UploadCloud } from 'lucide-react'
import type { CaseRecord } from '../types'
import { api } from '../lib/api'
import { Alert, Button, Field, Panel, StatusBadge } from './UI'

const MAX_UI_BYTES = 500 * 1024 * 1024

export function CaseIntake({ caseId, onCaseCreated, onReload }: { caseId: number | null; onCaseCreated: (id: number) => void; onReload: () => Promise<void> }) {
  const [caseName, setCaseName] = useState('Warehouse Intrusion - Phase 2')
  const [examinerName, setExaminerName] = useState('YOKAI-EXAM-01')
  const [creating, setCreating] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pairText = useMemo(() => {
    if (!videoFile && !jsonFile) return 'No evidence selected'
    if (videoFile && jsonFile) return `${videoFile.name} + ${jsonFile.name}`
    return videoFile?.name || jsonFile?.name || ''
  }, [videoFile, jsonFile])

  function inspectFiles(files: File[]) {
    let video: File | null = videoFile
    let json: File | null = jsonFile
    for (const file of files) {
      const name = file.name.toLowerCase()
      if (['.mp4', '.avi', '.mkv', '.mov'].some(ext => name.endsWith(ext))) video = file
      else if (name.endsWith('.json')) json = file
    }
    setVideoFile(video)
    setJsonFile(json)
    setMessage(null)
  }

  async function createCase() {
    setCreating(true)
    setMessage(null)
    try {
      const record: CaseRecord = await api.createCase(caseName.trim(), examinerName.trim())
      onCaseCreated(record.id)
      setMessage({ text: `Case ${record.id} created and assigned to ${record.examiner_name}.`, type: 'success' })
      await onReload()
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to create case.', type: 'error' })
    } finally { setCreating(false) }
  }

  async function uploadEvidence() {
    if (!caseId) return setMessage({ text: 'Load or create a case before uploading evidence.', type: 'info' })
    if (!videoFile) return setMessage({ text: 'Select a video evidence file first.', type: 'info' })
    if (videoFile.size > MAX_UI_BYTES || (jsonFile && jsonFile.size > MAX_UI_BYTES)) return setMessage({ text: 'Selected file exceeds the 500 MB backend limit.', type: 'error' })
    setUploading(true)
    setMessage(null)
    try {
      const result = await api.uploadEvidence(caseId, videoFile, jsonFile)
      const sha = result?.evidence?.sha256 || ''
      setMessage({ text: `Evidence acquired successfully. SHA-256 ${sha || 'computed'}; status ${result?.evidence?.status || 'METADATA_PARSED'}.`, type: 'success' })
      await onReload()
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Evidence upload failed.', type: 'error' })
    } finally { setUploading(false) }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">01 / Acquisition</div>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">Case Intake</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Register the investigation, preserve the examiner identity, and acquire CCTV evidence with sidecar metadata.</p>
        </div>
        {caseId && <StatusBadge status={`CASE ${caseId}`} tone="blue" />}
      </div>

      {message && <Alert message={message.text} type={message.type} />}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <Panel title="Case registration" subtitle="The examiner identity is stored with the case record.">
          <div className="space-y-4">
            <Field label="Case name"><input value={caseName} onChange={e => setCaseName(e.target.value)} className="focus-ring w-full border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200" /></Field>
            <Field label="Examiner name" hint="Forensic display identity; authenticated owner is derived from the JWT session."><input value={examinerName} onChange={e => setExaminerName(e.target.value)} className="focus-ring w-full border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-200" /></Field>
            <Button onClick={createCase} loading={creating} className="w-full"><FilePlus2 size={15} /> Create case</Button>
          </div>
        </Panel>

        <Panel title="Evidence acquisition" subtitle="Accepted video: MP4, AVI, MKV, MOV. Optional metadata: JSON.">
          <input ref={inputRef} type="file" multiple accept=".mp4,.avi,.mkv,.mov,.json,video/*,application/json" className="hidden" onChange={e => inspectFiles(Array.from(e.target.files || []))} />
          <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); inspectFiles(Array.from(e.dataTransfer.files)) }} onClick={() => inputRef.current?.click()} className={`cursor-pointer border border-dashed px-6 py-10 text-center transition ${dragging ? 'border-sky-500 bg-sky-950/20' : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950'}`}>
            <UploadCloud size={22} className="mx-auto text-sky-400" />
            <div className="mt-3 text-sm font-semibold text-slate-200">Drop evidence files here</div>
            <div className="mt-1 text-xs text-slate-600">or click to browse. Select one video and one JSON sidecar.</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-600">Video evidence</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-300"><FileUp size={14} className="text-slate-500" /> {videoFile?.name || 'Not selected'}</div>
              {videoFile && <div className="mt-1 font-mono text-[10px] text-slate-600">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</div>}
            </div>
            <div className="border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-600">JSON sidecar</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-300"><Link2 size={14} className="text-slate-500" /> {jsonFile?.name || 'Optional'}</div>
              {jsonFile && <div className="mt-1 font-mono text-[10px] text-slate-600">{(jsonFile.size / 1024).toFixed(1)} KB</div>}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="min-w-0 text-[10px] text-slate-600">Selection: <span className="font-mono text-slate-500">{pairText}</span></div>
            <Button onClick={uploadEvidence} loading={uploading} disabled={!videoFile}><UploadCloud size={15} /> Acquire evidence</Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
