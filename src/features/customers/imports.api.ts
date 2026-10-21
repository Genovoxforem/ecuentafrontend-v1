import { fapi } from '../../api/axios'

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown[]
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response?.success) {
    const errors = response?.errors?.map((error) => typeof error === 'string' ? error : JSON.stringify(error)) ?? []
    throw new Error([response?.message, ...errors].filter(Boolean).join(': ') || 'The import API returned an unsuccessful response.')
  }
  return response.data
}

export interface ImportDataset {
  code: string
  label: string
  module: string
  module_real?: string
  module_key?: string
  entity: string
  entity_icon?: string
  permitted: boolean
  position?: number
  fields_count?: number
  tables_count?: number
  step2_url?: string
}

export interface ImportFormat {
  format: string
  label: string
  description?: string
  version?: string
  usable: boolean
  error?: string
  example_url?: string
}

export interface ImportFile {
  name: string
  size: string
  size_raw: number
  date: string
  date_raw: number
  download_url: string
}

export interface UploadedImportFile {
  name: string
  size: string
  size_raw: number
}

export interface ImportDatasetInfo {
  code: string
  label: string
  module: string
  entity: string
}

export async function fetchImportDatasets(params: { entity?: string; search?: string; permitted?: boolean } = {}) {
  const response = await fapi.get<ApiResponse<{
    datasets: ImportDataset[]
    count: number
    total: number
    options: { entities: string[]; can_import: boolean }
  }>>('/imports/fapi/datasets.php', {
    params: {
      ...params,
      ...(params.permitted === undefined ? {} : { permitted: params.permitted ? 1 : 0 }),
    },
  })
  return unwrap(response.data)
}

export async function fetchImportFormats(datatoimport: string) {
  const response = await fapi.get<ApiResponse<{
    dataset: ImportDatasetInfo
    formats: ImportFormat[]
    count: number
  }>>('/imports/fapi/formats.php', { params: { datatoimport } })
  return unwrap(response.data)
}

export async function fetchImportFiles(datatoimport: string) {
  const response = await fapi.get<ApiResponse<{
    dataset: ImportDatasetInfo
    format: string
    files: ImportFile[]
    options: { upload_enabled: boolean; max_upload_size: number }
  }>>('/imports/fapi/files.php', { params: { datatoimport } })
  return unwrap(response.data)
}

export async function uploadImportFile(datatoimport: string, file: File) {
  const body = new FormData()
  body.append('datatoimport', datatoimport)
  body.append('file', file)
  const response = await fapi.post<ApiResponse<{ file: UploadedImportFile; files: ImportFile[] }>>(
    '/imports/fapi/files.php',
    body,
    { params: { action: 'upload' } },
  )
  return unwrap(response.data)
}

export async function deleteImportFile(datatoimport: string, filetoimport: string) {
  const response = await fapi.post<ApiResponse<{ files: ImportFile[] }>>(
    '/imports/fapi/files.php',
    { datatoimport, filetoimport },
    { params: { action: 'delete' } },
  )
  return unwrap(response.data)
}

export interface ImportMapping {
  dataset: ImportDatasetInfo
  format: string
  file: { name: string; lines: number }
  source_columns: Array<{ column: number; example: string; is_empty: boolean }>
  target_fields: Array<{ code: string; label: string; required: boolean; example?: string; hidden: boolean }>
  suggested_mapping: Record<string, string>
  saved_profiles: ImportProfile[]
  options: {
    separator: string
    enclosure: string
    update_keys: string[]
    preselected_update_keys: string[]
  }
}

export interface ImportProfile {
  id: number
  label: string
  visibility: 'all' | 'mine'
  mapping: Record<string, string>
  fields: string[]
}

export async function fetchImportMapping(input: {
  datatoimport: string
  format: string
  filetoimport: string
  separator?: string
  enclosure?: string
}) {
  const response = await fapi.get<ApiResponse<ImportMapping>>('/imports/fapi/mapping.php', { params: input })
  return unwrap(response.data)
}

export interface ImportRunInput {
  datatoimport: string
  format: string
  filetoimport: string
  excludefirstline: number
  mapping: Record<string, string>
}

export interface ImportRunResult {
  simulated: boolean
  dataset: ImportDatasetInfo
  file: string
  import_id?: string
  lines: number
  lines_read?: number
  end_of_file?: number
  inserted: number
  updated: number
  ok: number
  errors: Array<{ line: number; type: string; message: string }>
  warnings: Array<{ line: number; type: string; message: string }>
  error_count: number
  warning_count: number
  committed?: boolean
}

export async function simulateImport(input: ImportRunInput) {
  const response = await fapi.post<ApiResponse<ImportRunResult>>(
    '/imports/fapi/run.php',
    { ...input, action: 'simulate' },
    { params: { action: 'simulate' }, timeout: 120_000 },
  )
  return unwrap(response.data)
}

export async function runImport(input: ImportRunInput) {
  const response = await fapi.post<ApiResponse<ImportRunResult>>(
    '/imports/fapi/run.php',
    { ...input, action: 'run', confirm: true },
    { params: { action: 'run' }, timeout: 120_000 },
  )
  return unwrap(response.data)
}

export async function fetchImportProfiles(datatoimport: string) {
  const response = await fapi.get<ApiResponse<{ dataset: ImportDatasetInfo; profiles: ImportProfile[] }>>(
    '/imports/fapi/profiles.php',
    { params: { datatoimport } },
  )
  return unwrap(response.data)
}

export async function saveImportProfile(input: {
  datatoimport: string
  label: string
  visibility: 'all' | 'mine'
  mapping: Record<string, string>
}) {
  const response = await fapi.post<ApiResponse<{ id: number; label: string; profiles: ImportProfile[] }>>(
    '/imports/fapi/profiles.php',
    input,
    { params: { action: 'save' } },
  )
  return unwrap(response.data)
}

export async function deleteImportProfile(id: number) {
  const response = await fapi.post<ApiResponse<{ id: number; profiles: ImportProfile[] }>>(
    '/imports/fapi/profiles.php',
    { id },
    { params: { action: 'delete' } },
  )
  return unwrap(response.data)
}
