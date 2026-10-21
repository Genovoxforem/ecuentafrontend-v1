import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeContractContact,
  changeContractFollowup,
  deleteContractDocument,
  deleteContractDocumentLink,
  fetchContractAgenda,
  fetchContractContacts,
  fetchContractDocuments,
  fetchContractFollowup,
  fetchRecordNotes,
  saveRecordNotes,
  linkContractDocument,
  uploadContractDocument,
  type ContractContactChange,
  type FollowupChange,
} from '../../api/contractTabs'

const key = (id: string | undefined, tab: string, base = '') => ['contracts', 'tab', base, id, tab] as const

export function useContractContacts(id: string | undefined) {
  return useQuery({ queryKey: key(id, 'contacts'), queryFn: () => fetchContractContacts(Number(id)), enabled: !!id })
}

export function useChangeContractContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: ContractContactChange) => changeContractContact(Number(id), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(id, 'contacts') }),
  })
}

export function useContractDocuments(id: string | undefined, base?: string) {
  return useQuery({ queryKey: key(id, 'documents', base), queryFn: () => fetchContractDocuments(Number(id), base), enabled: !!id })
}

export function useContractDocumentActions(id: string | undefined, base?: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: key(id, 'documents', base) })
  return {
    upload: useMutation({ mutationFn: (file: File) => uploadContractDocument(Number(id), file, base), onSuccess: refresh }),
    link: useMutation({ mutationFn: (input: { link: string; label: string }) => linkContractDocument(Number(id), input.link, input.label, base), onSuccess: refresh }),
    removeFile: useMutation({ mutationFn: (name: string) => deleteContractDocument(Number(id), name, base), onSuccess: refresh }),
    removeLink: useMutation({ mutationFn: (linkid: number) => deleteContractDocumentLink(Number(id), linkid, base), onSuccess: refresh }),
  }
}

export function useContractAgenda(id: string | undefined, base?: string) {
  return useQuery({ queryKey: key(id, 'agenda', base), queryFn: () => fetchContractAgenda(Number(id), base), enabled: !!id })
}

export function useContractFollowup(id: string | undefined) {
  return useQuery({ queryKey: key(id, 'followup'), queryFn: () => fetchContractFollowup(Number(id)), enabled: !!id })
}

export function useRecordNotes(base: string, id: string | undefined) {
  return useQuery({ queryKey: key(id, 'notes', base), queryFn: () => fetchRecordNotes(base, Number(id)), enabled: !!id })
}

export function useSaveRecordNotes(base: string, id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notes: { note_public: string; note_private: string }) => saveRecordNotes(base, Number(id), notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(id, 'notes', base) }),
  })
}

export function useChangeContractFollowup(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: FollowupChange) => changeContractFollowup(Number(id), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(id, 'followup') }),
  })
}
