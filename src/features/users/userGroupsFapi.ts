import axios from 'axios'
import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { requireJson } from '../salesOrders/orderApi'

// user/group/fapi (26 Oct 2026): list.php (every group with its member count) and group.php (one group with its members and the permission
// matrix). They replace user/group/user-groups-sidebarlist-ajax.php, which has no member count, and the static permission list of the edit page.
// The writers execute since 5 Nov 2026 (checked live on newecuenta that day with a throwaway group that was deleted again):
//   POST group.php?action=create               { name (required), note }                  -> 201 { id, group }
//   POST group.php?action=update&id=N          { name, note }                             -> 200
//   POST group.php?action=add_member&id=N      { user_id }  /  action=remove_member       -> 200
//   DELETE group.php?id=N                      -> 200 { deleted_id }   (POST ?action=delete is refused: "Unknown action")
// Granting or revoking a right is not among them, so the permission matrix stays read-only.

export interface FapiGroupItem {
  id: number
  name: string
  note: string | null
  member_count: number
  datec: string
  deletable: boolean
}
export interface UserGroupRow {
  id: number
  name: string
  note: string
  createdAt: string
  memberCount: number
}
export const mapGroupRow = (g: FapiGroupItem): UserGroupRow => ({ id: g.id, name: g.name, note: g.note ?? '', createdAt: g.datec, memberCount: g.member_count })
// the endpoint pages its answer (default 15): everything is asked in one call
export const loadUserGroups = async (): Promise<UserGroupRow[]> =>
  (await fapiGet<{ items: FapiGroupItem[] }>('/user/group/fapi/list.php', { limit: 500, sort: 'name' })).items.map(mapGroupRow).sort((a, b) => a.name.localeCompare(b.name))

export interface FapiGroupRight {
  id: number
  perms: string
  subperms: string | null
  label: string
  granted: boolean
}
export interface FapiGroup {
  id: number
  name: string
  note: string | null
  datec: string
  members: Array<{ id: number; login: string; lastname: string; firstname: string; email: string; admin: boolean; active: boolean }>
  member_count: number
  permission_matrix: { modules: Array<{ module: string; label: string; rights: FapiGroupRight[] }>; granted_total: number; total: number }
  can_edit: boolean
  can_delete: boolean
}
export interface UserGroupDetail {
  id: number
  name: string
  note: string
  createdAt: string
  members: Array<{ id: number; login: string; name: string; email: string; admin: boolean; active: boolean }>
  modules: Array<{ module: string; label: string; rights: Array<{ id: number; label: string; granted: boolean }> }>
  grantedTotal: number
  total: number
  canEdit: boolean
  canDelete: boolean
}
export const mapGroupDetail = (g: FapiGroup): UserGroupDetail => ({
  id: g.id,
  name: g.name,
  note: g.note ?? '',
  createdAt: g.datec,
  members: g.members.map((m) => ({ id: m.id, login: m.login, name: [m.firstname, m.lastname].filter(Boolean).join(' ') || m.login, email: m.email, admin: m.admin, active: m.active })),
  modules: g.permission_matrix.modules.map((m) => ({ module: m.module, label: m.label, rights: m.rights.map((r) => ({ id: r.id, label: r.label, granted: r.granted })) })),
  grantedTotal: g.permission_matrix.granted_total,
  total: g.permission_matrix.total,
  canEdit: g.can_edit,
  canDelete: g.can_delete,
})
export const loadUserGroup = async (id: string) => mapGroupDetail(await fapiGet<FapiGroup>('/user/group/fapi/group.php', { id }))

const GROUP = '/user/group/fapi/group.php'
export const createGroupFapi = (name: string, note: string) => fapiPost<{ id: number }>(GROUP, { name, note }, { action: 'create' })
export const updateGroupFapi = (id: number, name: string, note: string) => fapiPost<unknown>(GROUP, { name, note }, { action: 'update', id })
export const addGroupMemberFapi = (id: number, userId: number) => fapiPost<unknown>(GROUP, { user_id: userId }, { action: 'add_member', id })
export const removeGroupMemberFapi = (id: number, userId: number) => fapiPost<unknown>(GROUP, { user_id: userId }, { action: 'remove_member', id })
export async function deleteGroupFapi(id: number): Promise<void> {
  try {
    const res = requireJson(await fapi.delete<{ success?: boolean; message?: string | null }>(GROUP, { params: { id } }))
    if (res.data.success === false) throw new Error(res.data.message || 'The backend did not delete this group.')
  } catch (e) {
    // A refusal is a JSON error whose message says why.
    const message = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
    throw message ? new Error(message) : e
  }
}
