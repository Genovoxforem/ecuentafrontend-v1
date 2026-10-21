import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  Users2,
} from 'lucide-react'
import { WizardStepper } from '../../../shared/components/layout/StickyFormShell'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { useImportDatasets, useImportFiles, useImportFormats, useImportMapping, useImportProfiles, useDeleteImportFile, useDeleteImportProfile, useRunImport, useSaveImportProfile, useSimulateImport, useUploadImportFile } from '../imports.queries'
import type { ImportDataset, ImportFormat, ImportRunInput } from '../imports.api'

const STEPS = [
  'Choose dataset',
  'Choose format',
  'Upload file',
  'Map columns',
  'Simulate',
  'Import',
] as const
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6
type WizardParam = 'dataset' | 'format' | 'file' | 'step' | 'mapping' | 'first' | 'separator' | 'enclosure'

// The same step indicator every other wizard uses (numbered circles, title and subtitle under each).
const STEP_SUBTITLES = ['What to import', 'CSV or Excel', 'Pick the file', 'Match fields', 'Dry run', 'Run it'] as const
const STEP_DEFS = STEPS.map((title, i) => ({ title, subtitle: STEP_SUBTITLES[i] }))

function Stepper({ step }: { step: WizardStep }) {
  return (
    <div className="w-full">
      <WizardStepper steps={STEP_DEFS} step={step - 1} onStep={() => {}} canGoTo={() => false} />
    </div>
  )
}

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error.response
    if (response && typeof response === 'object' && 'data' in response) {
      const data = response.data
      if (data && typeof data === 'object') {
        const payload = data as { message?: unknown; errors?: unknown[] }
        const details = payload.errors?.map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object' && 'message' in item) return String(item.message)
          return JSON.stringify(item)
        }) ?? []
        const message = [typeof payload.message === 'string' ? payload.message : '', ...details].filter(Boolean).join(': ')
        if (message) return message
      }
    }
  }
  return error instanceof Error ? error.message : fallback
}

async function downloadTemplate(format: ImportFormat) {
  if (!format.example_url) throw new Error('The backend did not provide a template URL for this format.')
  const response = await fetch(format.example_url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error(`The backend returned ${response.status} while generating the template.`)
  const blob = await response.blob()
  const preview = await blob.slice(0, 4096).text()
  if (/Fatal error|xdebug-error|<b>Warning<\/b>|<html/i.test(preview)) {
    throw new Error('The backend could not generate this template file.')
  }
  if (format.format.toLowerCase() === 'xlsx') {
    const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
      throw new Error('The backend returned an invalid spreadsheet template.')
    }
  }
  const filename = /filename="?([^";]+)"?/i.exec(response.headers.get('content-disposition') ?? '')?.[1]
    ?? `import-template.${format.format}`
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}

function TemplateDownload({ format }: { format: ImportFormat }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload() {
    setBusy(true)
    setError('')
    try {
      await downloadTemplate(format)
    } catch (cause) {
      setError(errorMessage(cause, 'Could not download the template.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" disabled={busy || !format.example_url} onClick={() => void handleDownload()} className="flex items-center gap-2 text-sm font-medium text-brand hover:underline disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download template
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

function showRunResult(result: NonNullable<ReturnType<typeof useSimulateImport>['data']>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Rows read', result.lines_read ?? result.lines],
          ['Imported', result.inserted],
          ['Updated', result.updated],
          ['Succeeded', result.ok],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-xs text-text-faint">{label}</p>
            <p className="text-lg font-semibold text-text!">{value}</p>
          </div>
        ))}
      </div>
      {result.errors.length > 0 && (
        <div className="space-y-1 rounded-lg border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm font-semibold text-danger">Errors ({result.error_count})</p>
          {result.errors.map((item, index) => <p key={`${item.line}-${index}`} className="text-xs text-danger">Line {item.line}: {item.message}</p>)}
        </div>
      )}
      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="text-sm font-semibold text-warning">Warnings ({result.warning_count})</p>
          {result.warnings.map((item, index) => <p key={`${item.line}-${index}`} className="text-xs text-text-muted">Line {item.line}: {item.message}</p>)}
        </div>
      )}
    </div>
  )
}

export function ImportCustomersWizard() {
  const { data: datasets, isLoading: datasetsLoading, isError: datasetsError, error: datasetError } = useImportDatasets()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [separator, setSeparator] = useState(searchParams.get('separator') ?? ',')
  const [enclosure, setEnclosure] = useState(searchParams.get('enclosure') ?? '"')
  const [firstLine, setFirstLine] = useState(Number(searchParams.get('first') ?? 2))
  const [profileLabel, setProfileLabel] = useState('')
  const [profileVisibility, setProfileVisibility] = useState<'all' | 'mine'>('mine')
  const [confirmed, setConfirmed] = useState(false)

  const datasetCode = searchParams.get('dataset')
  const formatCode = searchParams.get('format')
  const fileName = searchParams.get('file')
  const rawStep = Number(searchParams.get('step') ?? (datasetCode ? 2 : 1))
  const step: WizardStep = rawStep >= 1 && rawStep <= 6 ? rawStep as WizardStep : 1
  const selected = useMemo(() => datasets?.find((item) => item.code === datasetCode) ?? null, [datasets, datasetCode])
  const formatsQuery = useImportFormats(datasetCode)
  const filesQuery = useImportFiles(datasetCode)
  const mappingQuery = useImportMapping({ datatoimport: datasetCode, format: formatCode, filetoimport: fileName, separator, enclosure })
  const profilesQuery = useImportProfiles(datasetCode)
  const uploadFile = useUploadImportFile(datasetCode ?? '')
  const deleteFile = useDeleteImportFile(datasetCode ?? '')
  const saveProfile = useSaveImportProfile(datasetCode ?? '')
  const deleteProfile = useDeleteImportProfile(datasetCode ?? '')
  const simulate = useSimulateImport()
  const run = useRunImport()
  const [simulationInput, setSimulationInput] = useState<ImportRunInput | null>(null)

  useEffect(() => {
    if (mappingQuery.data) {
      const savedMapping = searchParams.get('mapping')
      if (savedMapping) {
        try {
          setMapping(JSON.parse(savedMapping) as Record<string, string>)
        } catch {
          setMapping(mappingQuery.data.suggested_mapping)
        }
      } else {
        setMapping(mappingQuery.data.suggested_mapping)
      }
      setSeparator(mappingQuery.data.options.separator)
      setEnclosure(mappingQuery.data.options.enclosure)
    }
  }, [mappingQuery.data, searchParams])

  const grouped = useMemo(() => {
    const query = search.trim().toLowerCase()
    const groups = new Map<string, ImportDataset[]>()
    for (const item of datasets ?? []) {
      if (query && ![item.label, item.module, item.code].some((value) => value.toLowerCase().includes(query))) continue
      const items = groups.get(item.module) ?? []
      items.push(item)
      groups.set(item.module, items)
    }
    return Array.from(groups.entries())
  }, [datasets, search])

  function updateUrl(next: Partial<Record<WizardParam, string | null>>, replace = false) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else if (value !== undefined) params.set(key, value)
    }
    setSearchParams(params, { replace })
  }

  function pickDataset(item: ImportDataset) {
    if (!item.permitted) return
    setSimulationInput(null)
    setFirstLine(2)
    updateUrl({ dataset: item.code, format: null, file: null, mapping: null, first: null, separator: null, enclosure: null, step: '2' })
  }

  function pickFile(file: string) {
    setSimulationInput(null)
    setFirstLine(2)
    updateUrl({ file, mapping: null, first: null, step: '3' })
  }

  function changeMapping(next: Record<string, string>) {
    setMapping(next)
    updateUrl({ mapping: JSON.stringify(next) }, true)
  }

  function changeCsvOption(key: 'separator' | 'enclosure', value: string) {
    if (key === 'separator') setSeparator(value)
    else setEnclosure(value)
    updateUrl({ [key]: value }, true)
  }

  function makeRunInput(): ImportRunInput {
    if (!datasetCode || !formatCode || !fileName) throw new Error('Choose a dataset, format, and file before continuing.')
    const mappedColumns = Object.fromEntries(Object.entries(mapping).filter(([, target]) => target))
    return {
      datatoimport: datasetCode,
      format: formatCode,
      filetoimport: fileName,
      excludefirstline: firstLine,
      mapping: mappedColumns,
    }
  }

  const currentFile = filesQuery.data?.files.find((item) => item.name === fileName)
  const inputClass = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text'
  const secondaryButton = 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-50'
  const primaryButton = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!"><Users2 size={20} className="text-brand" /> Import Customers/Vendors</h2>
        <Stepper step={step} />
      </div>

      {selected && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Users2 size={18} /></span>
          <div className="min-w-0"><p className="text-xs uppercase tracking-wide text-text-faint">{selected.module}</p><p className="truncate font-semibold text-text!">{selected.label}</p></div>
        </div>
      )}

      {step === 1 && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <span className="text-sm text-text-muted">Choose the dataset you want to import…</span>
            <div className="relative w-56"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search datasets" className={`${inputClass} pl-8`} /></div>
          </div>
          {datasetsLoading ? <p className="px-4 py-4 text-sm text-text-faint">Loading datasets…</p>
            : datasetsError ? <p role="alert" className="px-4 py-4 text-sm text-danger">{errorMessage(datasetError, 'Could not load datasets.')}</p>
              : grouped.length === 0 ? <p className="px-4 py-4 text-sm text-text-faint">{search ? 'No datasets match your search.' : 'The backend has no company datasets available.'}</p>
                : <div className="max-h-[65vh] divide-y divide-border overflow-y-auto">{grouped.map(([module, items]) => <div key={module}>
                  <div className="sticky top-0 bg-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-faint">{module}</div>
                  {items.map((item) => <button key={item.code} type="button" disabled={!item.permitted} onClick={() => pickDataset(item)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50">
                    <span><span className="block text-sm font-medium text-brand">{item.label}</span><span className="text-xs text-text-faint">{item.fields_count ?? 0} fields {item.permitted ? '' : '· Permission required'}</span></span><ChevronRight size={16} className="shrink-0 text-text-faint" />
                  </button>)}
                </div>)}</div>}
        </Card>
      )}

      {step > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => {
            if (step === 5) {
              setSimulationInput(null)
              simulate.reset()
            }
            updateUrl({ step: String(Math.max(1, step - 1)) })
          }} className={secondaryButton}><ArrowLeft size={14} /> Back</button>
          {step === 2 && <button type="button" onClick={() => updateUrl({ dataset: null, format: null, file: null, step: '1' })} className="text-sm text-text-muted hover:text-text">Choose another dataset</button>}
        </div>
      )}

      {step === 2 && (
        <Card className="!h-auto space-y-4">
          <h3 className="font-semibold text-text!">Choose a format</h3>
          {formatsQuery.isLoading ? <p className="text-sm text-text-muted">Loading supported formats…</p>
            : formatsQuery.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(formatsQuery.error, 'Could not load formats.')}</p>
              : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{formatsQuery.data?.formats.map((format) => {
                const isCsv = format.format.toLowerCase() === 'csv'
                const Icon: ComponentType<{ size?: number }> = isCsv ? FileText : FileSpreadsheet
                const color: IconColor = isCsv ? 'blue' : 'green'
                return <div key={format.format} className={`rounded-xl border p-4 ${formatCode === format.format ? 'border-brand bg-brand/5' : 'border-border'}`}>
                  <div className="mb-3 flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${ICON_STYLES[color]}`}><Icon size={18} /></span><div><p className="font-semibold text-text!">{format.label}</p><p className="text-xs text-text-faint">{format.format.toUpperCase()} {format.version ? `· ${format.version}` : ''}</p></div></div>
                  <p className="mb-3 min-h-10 text-sm text-text-muted">{format.description || `Import data using ${format.label}.`}</p>
                  {!format.usable && <p className="mb-3 text-xs text-danger">{format.error || 'This format is unavailable on the server.'}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" disabled={!format.usable} onClick={() => { setFirstLine(2); updateUrl({ format: format.format, file: null, mapping: null, first: null, step: '3' }) }} className={primaryButton}>Use format <ArrowRight size={14} /></button>
                    {format.usable && <TemplateDownload format={format} />}
                  </div>
                </div>
              })}</div>}
        </Card>
      )}

      {step === 3 && (
        <Card className="!h-auto space-y-4">
          <h3 className="font-semibold text-text!">Upload or select a source file</h3>
          {filesQuery.isLoading ? <p className="text-sm text-text-muted">Loading files…</p>
            : filesQuery.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(filesQuery.error, 'Could not load import files.')}</p>
              : <>
                {filesQuery.data?.options.upload_enabled ? <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
                  <label className="min-w-60 flex-1 space-y-1 text-sm text-text"><span>Choose file</span><input type="file" accept={formatCode ? `.${formatCode}` : undefined} onChange={(event) => setFileToUpload(event.target.files?.[0] ?? null)} className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-xs" /></label>
                  <button type="button" disabled={!fileToUpload || uploadFile.isPending || (!!fileToUpload && fileToUpload.size > (filesQuery.data?.options.max_upload_size ?? Infinity))} onClick={() => fileToUpload && uploadFile.mutate(fileToUpload, { onSuccess: () => setFileToUpload(null) })} className={primaryButton}>{uploadFile.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload</button>
                  {filesQuery.data?.options.max_upload_size && <p className="w-full text-xs text-text-faint">Maximum size: {(filesQuery.data.options.max_upload_size / 1024 / 1024).toFixed(1)} MB</p>}
                  {fileToUpload && fileToUpload.size > (filesQuery.data?.options.max_upload_size ?? Infinity) && <p role="alert" className="w-full text-xs text-danger">This file exceeds the server's maximum upload size.</p>}
                </div> : <p className="rounded-lg border border-warning/30 p-3 text-sm text-warning">Uploads are disabled on this server.</p>}
                {uploadFile.isError && <p role="alert" className="text-sm text-danger">{errorMessage(uploadFile.error, 'Could not upload the file.')}</p>}
                <div className="divide-y divide-border rounded-lg border border-border">{(filesQuery.data?.files ?? []).length === 0 ? <p className="p-4 text-sm text-text-faint">No uploaded files for this dataset.</p> : filesQuery.data?.files.map((file) => <div key={file.name} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input type="radio" name="import-file" checked={fileName === file.name} onChange={() => pickFile(file.name)} /><span className="min-w-0"><span className="block truncate text-sm font-medium text-text!">{file.name}</span><span className="text-xs text-text-faint">{file.size} · {file.date}</span></span></label>
                  <div className="flex items-center gap-3">{file.download_url && <a className="text-xs text-brand hover:underline" href={file.download_url} target="_blank" rel="noreferrer">Download</a>}<button type="button" aria-label={`Delete ${file.name}`} disabled={deleteFile.isPending} onClick={() => {
                    if (window.confirm(`Delete ${file.name}?`)) {
                      deleteFile.mutate(file.name, { onSuccess: () => { if (fileName === file.name) updateUrl({ file: null }) } })
                    }
                  }} className="text-danger hover:opacity-70 disabled:opacity-50"><Trash2 size={15} /></button></div>
                </div>)}</div>
                {deleteFile.isError && <p role="alert" className="text-sm text-danger">{errorMessage(deleteFile.error, 'Could not delete the file.')}</p>}
                <div className="flex justify-end"><button type="button" disabled={!fileName || !currentFile} onClick={() => updateUrl({ step: '4' })} className={primaryButton}>Map columns <ArrowRight size={14} /></button></div>
              </>}
        </Card>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {mappingQuery.isLoading ? <Card className="!h-auto text-sm text-text-muted">Reading file columns…</Card>
            : mappingQuery.isError ? <Card className="!h-auto"><p role="alert" className="text-sm text-danger">{errorMessage(mappingQuery.error, 'Could not read the file mapping.')}</p></Card>
              : mappingQuery.data && <>
                <Card className="!h-auto space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-text!">Map source columns</h3><p className="text-xs text-text-faint">{mappingQuery.data.file.lines} lines in {mappingQuery.data.file.name}</p></div><label className="flex items-center gap-2 text-sm text-text">First line to import<input type="number" min="0" value={firstLine} onChange={(event) => { const value = Math.max(0, Number(event.target.value)); setFirstLine(value); updateUrl({ first: String(value) }, true) }} className={`${inputClass} w-24`} /></label></div>
                  {formatCode?.toLowerCase() === 'csv' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm text-text">Separator<input value={separator === '\t' ? '\\t' : separator} onChange={(event) => changeCsvOption('separator', event.target.value === '\\t' ? '\t' : event.target.value)} className={inputClass} /></label><label className="space-y-1 text-sm text-text">Enclosure<input value={enclosure} onChange={(event) => changeCsvOption('enclosure', event.target.value)} className={inputClass} /></label></div>}
                  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3"><label className="min-w-48 flex-1 space-y-1 text-sm text-text">Saved mapping profile<select defaultValue="" onChange={(event) => {
                    const profile = profilesQuery.data?.profiles.find((item) => String(item.id) === event.target.value)
                    if (profile) changeMapping(profile.mapping)
                  }} className={inputClass}><option value="">Choose a saved profile</option>{profilesQuery.data?.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label} ({profile.visibility === 'all' ? 'shared' : 'mine'})</option>)}</select></label><label className="space-y-1 text-sm text-text">Profile name<input value={profileLabel} onChange={(event) => setProfileLabel(event.target.value)} className={inputClass} /></label><label className="space-y-1 text-sm text-text">Visibility<select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as 'all' | 'mine')} className={inputClass}><option value="mine">Only me</option><option value="all">Shared</option></select></label><button type="button" disabled={!profileLabel.trim() || saveProfile.isPending} onClick={() => saveProfile.mutate({ label: profileLabel.trim(), visibility: profileVisibility, mapping: Object.fromEntries(Object.entries(mapping).filter(([, target]) => target)) }, { onSuccess: () => setProfileLabel('') })} className={secondaryButton}>{saveProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Save profile</button></div>
                  {saveProfile.isError && <p role="alert" className="text-sm text-danger">{errorMessage(saveProfile.error, 'Could not save this profile.')}</p>}
                  <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-faint"><th className="px-3 py-2">Source column</th><th className="px-3 py-2">Example</th><th className="px-3 py-2">Target field</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{mappingQuery.data.source_columns.map((column) => <tr key={column.column} className="border-b border-border last:border-0"><td className="px-3 py-2 font-medium text-text!">Column {column.column}</td><td className="max-w-64 truncate px-3 py-2 text-text-muted">{column.example || '—'}</td><td className="px-3 py-2"><select value={mapping[String(column.column)] ?? ''} onChange={(event) => changeMapping({ ...mapping, [String(column.column)]: event.target.value })} className={inputClass}><option value="">Do not import</option>{mappingQuery.data.target_fields.filter((field) => !field.hidden).map((field) => <option key={field.code} value={field.code}>{field.label}{field.required ? ' *' : ''}</option>)}</select></td><td className="px-3 py-2 text-xs text-text-faint">{mappingQuery.data.target_fields.find((field) => field.code === mapping[String(column.column)])?.required ? 'Required target' : ''}</td></tr>)}</tbody></table></div>
                  {profilesQuery.data?.profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 text-xs text-text-muted"><span>{profile.label} · {profile.visibility === 'all' ? 'Shared' : 'Private'}</span><button type="button" disabled={deleteProfile.isPending} onClick={() => {
                    if (window.confirm(`Delete saved mapping "${profile.label}"?`)) deleteProfile.mutate(profile.id)
                  }} className="text-danger hover:underline">Delete profile</button></div>)}
                  {deleteProfile.isError && <p role="alert" className="text-sm text-danger">{errorMessage(deleteProfile.error, 'Could not delete this profile.')}</p>}
                  <div className="flex justify-end"><button type="button" onClick={() => { setSimulationInput(null); updateUrl({ step: '5' }) }} className={primaryButton}>Continue to simulation <ArrowRight size={14} /></button></div>
                </Card>
              </>}
        </div>
      )}

      {step === 5 && (
        <Card className="!h-auto space-y-4">
          <h3 className="font-semibold text-text!">Simulate import</h3>
          <p className="text-sm text-text-muted">Simulation validates the file and mapping without writing any records.</p>
          {simulate.data && showRunResult(simulate.data)}
          {simulate.isError && <p role="alert" className="text-sm text-danger">{errorMessage(simulate.error, 'Simulation failed.')}</p>}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={simulate.isPending} onClick={() => {
            try {
              const input = makeRunInput()
              setSimulationInput(input)
              simulate.mutate(input)
            } catch (cause) {
              simulate.reset()
              window.alert(errorMessage(cause, 'Could not prepare simulation.'))
            }
          }} className={secondaryButton}>{simulate.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Run simulation</button><button type="button" disabled={!simulate.data || simulate.data.error_count > 0 || simulate.isPending} onClick={() => { setConfirmed(false); updateUrl({ step: '6' }) }} className={primaryButton}>Review import <ArrowRight size={14} /></button></div>
        </Card>
      )}

      {step === 6 && (
        <Card className="!h-auto space-y-4">
          {run.data?.committed ? <>
            <div className="flex items-center gap-2 text-success"><Check size={18} /><h3 className="font-semibold">Import completed</h3></div>
            <p className="text-sm text-text-muted">Batch ID: {run.data.import_id || '—'} · {run.data.inserted} inserted · {run.data.updated} updated · {run.data.ok} successful rows.</p>
            {run.data.warnings.length > 0 && showRunResult(run.data)}
            <button type="button" onClick={() => { run.reset(); simulate.reset(); setSimulationInput(null); setSearchParams({}) }} className={primaryButton}>Start another import</button>
          </> : <>
            <h3 className="font-semibold text-text!">Confirm and import</h3>
            {simulate.data ? showRunResult(simulate.data) : <p className="text-sm text-warning">Run a successful simulation before committing the import.</p>}
            <label className="flex items-start gap-2 text-sm text-text"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!simulate.data || simulate.data.error_count > 0} className="mt-0.5" /><span>I confirm the simulation results and want to commit these records.</span></label>
            {run.isError && <p role="alert" className="text-sm text-danger">{errorMessage(run.error, 'Import failed. No records were committed.')}</p>}
            <div className="flex justify-end"><button type="button" disabled={!confirmed || !simulationInput || run.isPending || !simulate.data || simulate.data.error_count > 0} onClick={() => simulationInput && run.mutate(simulationInput)} className={primaryButton}>{run.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Confirm import</button></div>
          </>}
        </Card>
      )}
    </div>
  )
}
