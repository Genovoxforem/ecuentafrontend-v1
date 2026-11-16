import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadTagRows } from '../customers/tagTree.data'
import { addGroupMemberFapi, createGroupFapi, deleteGroupFapi, loadUserGroup, loadUserGroups, removeGroupMemberFapi, updateGroupFapi } from './userGroupsFapi'

// Endpoints read from user/group/list.php, user/group/ajax_group.php, and
// categories/fapi/list.php?type=user:
//
// - The group list and one group (members and permission matrix) come from user/group/fapi (userGroupsFapi.ts).
// - user/group/ajax_group.php's create_group action is a complete JSON
//   create endpoint: it calls the same UserGroup->create($user) the legacy
//   "New Group" modal/page use, duplicate-name-checks server-side, and
//   returns the new {id,name,editUrl}. It never validates the `token` it's
//   sent (per the PHP itself), so no CSRF token is sent here either.
// - categories/index.php?type=7 (Users Tags/Categories) is likewise a
//   stock server-rendered tree page with no JSON API of its own, and its
//   per-tag member-count badge comes from a PHP class method
//   (getObjectsInCateg) with no JSON equivalent. But
//   categories/tag-sidebarlist-ajax.php?type_id=7 IS a JSON list of the
//   underlying llx_categorie rows — used for the list here, omitting the
//   per-tag count. categories/card.php's own create action is a classic
//   Dolibarr form-POST-and-redirect page (newToken()/action=add), not a
//   JSON API, so tag creation stays a "create in legacy system" link
//   rather than a fabricated in-app form.

export type { UserGroupRow } from './userGroupsFapi'

// user/group/fapi/list.php: every group with its member count (the older user-groups-sidebarlist-ajax.php had none).
export function useUserGroupsList() {
  return useQuery({
    queryKey: ['users', 'groups', 'list'],
    queryFn: () => loadUserGroups(),
    staleTime: 1000 * 30,
  })
}

// user/group/fapi/group.php: one group with its members and the permission matrix.
export function useUserGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['users', 'groups', 'detail', id],
    queryFn: () => loadUserGroup(id as string),
    enabled: !!id,
  })
}

// Creating a group is user/group/fapi/group.php?action=create (the classic user/group/ajax_group.php create_group fallback was removed 12 Nov 2026).
export function useCreateUserGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { name: string; note: string }) => createGroupFapi(fields.name, fields.note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'groups'] }),
  })
}

export function useUpdateUserGroup(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { name: string; note: string }) => updateGroupFapi(id, fields.name.trim(), fields.note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'groups'] }),
  })
}

export function useGroupMembership(id: number) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users', 'groups'] })
  return {
    add: useMutation({ mutationFn: (userId: number) => addGroupMemberFapi(id, userId), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (userId: number) => removeGroupMemberFapi(id, userId), onSuccess: refresh }),
  }
}

export function useDeleteUserGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteGroupFapi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'groups'] }),
  })
}

export interface UserTagRow {
  id: number
  name: string
  color: string
  createdAt: string
}

// categories/fapi/list.php?type=user (Categorie::TYPE_USER = 7). The tags carry no creation date, so Created stays empty.
export function useUserTagsList() {
  return useQuery({
    queryKey: ['users', 'tags', 'list'],
    queryFn: async (): Promise<UserTagRow[]> => {
      return (await loadTagRows('user')).map((t) => ({ id: t.id, name: t.fullLabel, color: t.color, createdAt: '' })).sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 1000 * 30,
  })
}
