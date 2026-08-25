import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real per-arbitrary-user permissions API — userprofile/api/permissions.php
// (found by watching userprofile/index.php?id=X#permissions's own network
// traffic, then confirmed by reading the file directly). This supersedes
// the earlier conclusion that no such endpoint exists on this backend: that
// was based on api/user/index.php, which really is limited to the
// currently-logged-in user, but this newer userprofile/api/* namespace
// (also covering user/activities/notify/bank/notes/documents/agenda —
// confirmed via userprofile/api/meta.php's own real `tabs` list) has a
// dedicated, arbitrary-user-id endpoint instead.
//
// GET returns the real Dolibarr rights_def rows for every module, each
// flagged granted/direct/inherited (direct = assigned straight to this
// user, inherited = via a group they belong to). POST/PUT
// (action=add_right/del_right, confirmed by reading the file) actually
// writes real rows to llx_user_rights and requires the same Dolibarr
// session CSRF token every other mutation in this app already scrapes
// (here: userprofile/index.php's own <meta name="anti-csrf-currenttoken">
// tag — the standard Dolibarr theme convention, not something specific to
// this page).

export interface PermissionRight {
  id: number
  label: string
  perms: string
  subperms: string | null
  granted: boolean
  direct: boolean
  inherited: boolean
}

export interface PermissionModule {
  id: string
  label: string
  perms: PermissionRight[]
}

export interface UserPermissions {
  canEdit: boolean
  nbRights: number
  modules: PermissionModule[]
}

interface RawPermissionsResponse {
  ok: boolean
  can_edit: boolean
  nb_rights: number
  modules: PermissionModule[]
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (data.ok === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'permissions', userId],
    queryFn: async (): Promise<UserPermissions> => {
      const data = await fetchJson<RawPermissionsResponse>(`/userprofile/api/permissions.php?id=${userId}`)
      return { canEdit: data.can_edit, nbRights: data.nb_rights, modules: data.modules }
    },
    enabled: !!userId,
  })
}

// The standard Dolibarr theme's own CSRF meta tag — present on every
// authenticated page, scraped here from the same userprofile/index.php page
// this tab already lives on (save_lastsearch_values=1 is required for this
// route to resolve at all — confirmed live, omitting it 404s).
async function fetchUserProfileToken(userId: string): Promise<string> {
  const res = await fetch(`/userprofile/index.php?id=${userId}&save_lastsearch_values=1`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status} fetching CSRF token.`)
  const html = await res.text()
  const match = html.match(/name="anti-csrf-currenttoken" content="([a-f0-9]+)"/)
  if (!match) throw new Error('Could not find a CSRF token on the legacy page.')
  return match[1]
}

export function useToggleUserPermission(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rightId, grant }: { rightId: number; grant: boolean }) => {
      if (!userId) throw new Error('Missing user id.')
      const token = await fetchUserProfileToken(userId)
      const body = grant ? { token, add_right: rightId } : { token, del_right: rightId }
      const res = await fetch(`/userprofile/api/permissions.php?id=${userId}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: { ok: boolean; error?: string } = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to update permission.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'permissions', userId] })
    },
  })
}
