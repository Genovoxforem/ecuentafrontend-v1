import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteImportFile,
  deleteImportProfile,
  fetchImportDatasets,
  fetchImportFiles,
  fetchImportFormats,
  fetchImportMapping,
  fetchImportProfiles,
  runImport,
  saveImportProfile,
  simulateImport,
  uploadImportFile,
  type ImportRunInput,
} from './imports.api'

export function useImportDatasets() {
  return useQuery({
    queryKey: ['imports', 'datasets', 'company'],
    queryFn: async () => {
      const response = await fetchImportDatasets({ entity: 'company' })
      return response.datasets
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useImportFormats(datatoimport: string | null) {
  return useQuery({
    queryKey: ['imports', 'formats', datatoimport],
    queryFn: () => fetchImportFormats(datatoimport!),
    enabled: !!datatoimport,
    staleTime: 1000 * 60 * 10,
  })
}

export function useImportFiles(datatoimport: string | null) {
  return useQuery({
    queryKey: ['imports', 'files', datatoimport],
    queryFn: () => fetchImportFiles(datatoimport!),
    enabled: !!datatoimport,
    staleTime: 0,
  })
}

export function useImportMapping(input: {
  datatoimport: string | null
  format: string | null
  filetoimport: string | null
  separator: string
  enclosure: string
}) {
  return useQuery({
    queryKey: ['imports', 'mapping', input],
    queryFn: () => fetchImportMapping({
      datatoimport: input.datatoimport!,
      format: input.format!,
      filetoimport: input.filetoimport!,
      separator: input.separator,
      enclosure: input.enclosure,
    }),
    enabled: !!input.datatoimport && !!input.format && !!input.filetoimport,
  })
}

export function useImportProfiles(datatoimport: string | null) {
  return useQuery({
    queryKey: ['imports', 'profiles', datatoimport],
    queryFn: () => fetchImportProfiles(datatoimport!),
    enabled: !!datatoimport,
    staleTime: 0,
  })
}

export function useUploadImportFile(datatoimport: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadImportFile(datatoimport, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports', 'files', datatoimport] }),
  })
}

export function useDeleteImportFile(datatoimport: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (filetoimport: string) => deleteImportFile(datatoimport, filetoimport),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports', 'files', datatoimport] }),
  })
}

export function useSaveImportProfile(datatoimport: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof saveImportProfile>[0], 'datatoimport'>) =>
      saveImportProfile({ ...input, datatoimport }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports', 'profiles', datatoimport] }),
  })
}

export function useDeleteImportProfile(datatoimport: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteImportProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports', 'profiles', datatoimport] }),
  })
}

export function useSimulateImport() {
  return useMutation({ mutationFn: (input: ImportRunInput) => simulateImport(input) })
}

export function useRunImport() {
  return useMutation({ mutationFn: (input: ImportRunInput) => runImport(input) })
}
