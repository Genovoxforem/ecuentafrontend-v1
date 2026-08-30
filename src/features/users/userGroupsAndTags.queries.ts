import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real, live-verified endpoints — read directly from user/group/list.php,
// user/group/ajax_group.php, and categories/tag-sidebarlist-ajax.php (all
// read-only, per this app's frontend-only scope):
//
// - user/group/list.php itself (the reference "List of Groups" card grid)
//   has NO JSON API at all — it's server-rendered HTML computing a real
//   per-group member count + avatar stack via a llx_usergroup_user join
//   that exists nowhere else as JSON. Per this app's "only integrate real
//   APIs, never scrape HTML" rule, that specific number isn't reproduced
//   here — the list below shows real id/name/creation-date instead (from
//   user-groups-sidebarlist-ajax.php, a real DataTables JSON endpoint) and
//   honestly omits the per-group user count rather than fabricating or
//   scraping it.
// - user/group/ajax_group.php's create_group action IS a real, complete
//   JSON create endpoint (confirmed by reading its source): it calls the
//   same UserGroup->create($user) the legacy "New Group" modal/page use,
//   duplicate-name-checks server-side, and returns the new {id,name,
//   editUrl}. Notably it never validates the `token` it's sent — verified
//   in the PHP itself, not assumed — so no CSRF token is sent here either.
// - categories/index.php?type=7 (Users Tags/Categories) is likewise a
//   stock server-rendered tree page with no JSON API of its own, and its
//   per-tag member-count badge comes from a PHP class method
//   (getObjectsInCateg) with no JSON equivalent. But
//   categories/tag-sidebarlist-ajax.php?type_id=7 IS a real JSON list of
//   the underlying llx_categorie rows (confirmed live: returned the same
//   "Indian Employees" tag visible in the reference screenshot) — used
//   for the list here, again honestly omitting the per-tag count.
//   categories/card.php's own create action is a classic Dolibarr
//   form-POST-and-redirect page (checked: uses newToken()/action=add), not
//   a JSON API, so tag creation stays a "create in legacy system" link
//   rather than a fabricated in-app form.

export interface UserGroupRow {
  id: number
  name: string
  createdAt: string
}

interface RawSidebarListResponse {
  recordsTotal: string
  recordsFiltered: string
  data: Array<{ rowid: string; nom: string; label: string | null; phone: string | null }>
}

export function useUserGroupsList() {
  return useQuery({
    queryKey: ['users', 'groups', 'list'],
    queryFn: async (): Promise<UserGroupRow[]> => {
      const res = await fetch('/user/group/user-groups-sidebarlist-ajax.php?draw=1&start=0', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawSidebarListResponse = await res.json()
      return data.data
        .map((r) => ({ id: Number(r.rowid), name: r.nom, createdAt: r.phone ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 1000 * 30,
  })
}

export function useCreateUserGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fields: { name: string; note: string }) => {
      const body = new URLSearchParams({ action: 'create_group', name: fields.name, note: fields.note })
      const res = await fetch('/user/group/ajax_group.php', { method: 'POST', credentials: 'same-origin', body })
      const data: { ok: boolean; id?: number; name?: string; editUrl?: string; error?: string } = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to create group.')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'groups', 'list'] }),
  })
}

export interface UserTagRow {
  id: number
  name: string
  color: string
  createdAt: string
}

interface RawTagListResponse {
  recordsTotal: string
  recordsFiltered: string
  data: Array<{ rowid: string; nom: string; code_client: string | null; phone: string | null }>
}

// type_id=7 is Categorie::TYPE_USER's numeric id, matching the reference
// page's own categories/index.php?type=7 URL exactly.
export function useUserTagsList() {
  return useQuery({
    queryKey: ['users', 'tags', 'list'],
    queryFn: async (): Promise<UserTagRow[]> => {
      const res = await fetch('/categories/tag-sidebarlist-ajax.php?draw=1&start=0&type_id=7', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawTagListResponse = await res.json()
      return data.data
        .map((r) => ({ id: Number(r.rowid), name: r.nom, color: r.code_client || '', createdAt: r.phone ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 1000 * 30,
  })
}
