import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// ecm/fapi (26 Oct 2026, key-authenticated; replaces the HTML ecm/index.php and ecm/index_auto.php pages). Read live on newecuenta:
//   auto.php            -> { modules: [{ module, label, modulepart, enabled, dir_exists, nb_docs }] }   (fixed 17-module list)
//   auto.php?module=X   -> { module: {...}, files: [{ name, object_ref, relative_path, size_raw, size, date, mime, is_image, download_url }] }
//   tree.php            -> { tree: [], flat: [], meta: { total, can_setup, can_upload, note_nb_docs } }   (newecuenta has no manual folders)
// The manual-folder node shape is documented from the code only (no folder exists to read): id, parent_id, label, nb_docs_cached
// (-1 = never synchronised), full_label, level, children. `tree.php?dir=N` is documented as "a folder's live on-disk files"; its
// answer was not seen (no folder), so the file rows of a manual folder are read with the same keys as the automatic tree's.
// Writes (folder create/delete, upload, delete) are dry-run only on the backend and are not wired.

export interface EcmAutoModule {
  module: string
  label: string
  modulepart: string
  enabled: boolean
  dir_exists: boolean
  nb_docs: number
}

export interface EcmFile {
  name: string
  object_ref?: string
  relative_path: string
  size_raw: number
  size: string
  date: string
  mime: string
  is_image: boolean
  download_url: string
}

export interface EcmFolderNode {
  id: number
  parent_id: number | null
  label: string
  description?: string
  nb_docs_cached: number
  full_label?: string
  level?: number
  children?: EcmFolderNode[]
}

export interface EcmTree {
  tree: EcmFolderNode[]
  flat: EcmFolderNode[]
  meta: { total: number; can_setup: boolean; can_upload: boolean; note_nb_docs?: string }
}

export const useEcmAutoModules = () => useQuery({ queryKey: ['ecm', 'auto'], queryFn: async () => (await fapiGet<{ modules: EcmAutoModule[] }>('/ecm/fapi/auto.php')).modules ?? [], staleTime: 60_000 })

export const useEcmAutoFiles = (module: string | null) =>
  useQuery({
    queryKey: ['ecm', 'auto', module],
    queryFn: async () => (await fapiGet<{ files: EcmFile[] }>('/ecm/fapi/auto.php', { module: module ?? '' })).files ?? [],
    enabled: !!module,
    staleTime: 30_000,
  })

export const useEcmTree = () => useQuery({ queryKey: ['ecm', 'tree'], queryFn: () => fapiGet<EcmTree>('/ecm/fapi/tree.php'), staleTime: 60_000 })

export const useEcmFolderFiles = (dir: number | null) =>
  useQuery({
    queryKey: ['ecm', 'tree', dir],
    queryFn: async () => (await fapiGet<{ files?: EcmFile[] }>('/ecm/fapi/tree.php', { dir: dir ?? 0 })).files ?? [],
    enabled: dir !== null,
    staleTime: 30_000,
  })
