import { useMutation, useQueryClient } from '@tanstack/react-query'

// Real actions from core/actions_linkedfiles.inc.php — the generic
// upload/link/delete handler every module's document.php includes
// (confirmed by reading projet/document.php directly: it includes this
// exact shared file at line 74, no CSRF token check anywhere in either
// file). Field names read straight from that source:
//   Upload: sendit=1 + userfile=<File> (dol_add_file_process, 'userfile' var)
//   Link:   linkit=1 + link=<url> + label=<label> (Link::create() inside
//           dol_add_file_process — label is read via its own GETPOST, not
//           a function param)
// No JSON list endpoint exists for what's already attached/linked though,
// so ProjectDocumentsTab.tsx keeps those tables an honest empty state.

export function useUploadProjectDocument(projectId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.set('sendit', '1')
      body.set('userfile', file)
      const res = await fetch(`/projet/document.php?id=${projectId}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId, 'documents'] }),
  })
}

export function useLinkProjectDocument(projectId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { url: string; label: string }) => {
      const body = new URLSearchParams({ linkit: '1', link: input.url, label: input.label })
      const res = await fetch(`/projet/document.php?id=${projectId}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId, 'documents'] }),
  })
}
