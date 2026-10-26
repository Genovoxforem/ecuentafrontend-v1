import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadUserPermissions } from './userProfileFapi'

// The permissions tab. GET userprofile/fapi/permissions.php returns the rights of every module, each flagged granted / direct / inherited
// (direct = assigned straight to this user, inherited = via a group they belong to). Granting and revoking still POST to the older
// userprofile/api/permissions.php (action add_right / del_right) with the Dolibarr session CSRF token (here: userprofile/index.php's own
// <meta name="anti-csrf-currenttoken"> tag): the fapi grant / revoke only answers a plan and writes nothing.

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

export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'permissions', userId],
    queryFn: (): Promise<UserPermissions> => loadUserPermissions(userId as string),
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
