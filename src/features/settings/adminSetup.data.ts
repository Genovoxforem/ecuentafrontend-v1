import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// admin/fapi/modules.php (#374) and admin/fapi/consts.php (#375): key-authenticated, admin only, read-only (5 Nov 2026). Checked on
// newecuenta the same day.
//
// modules.php: the module catalogue, 95 modules (61 active + 34 disabled, as the changelog says). Filters search_keyword, search_nature
// (core | external | external_<publisher>), search_version (stable | experimental | development | deprecated) and search_status
// (active | disabled); it ignores limit / page. Item: {id, class, name, description, version, version_status, family, publisher, nature,
// picto, position, enabled}. The classic admin/modules.php asks for a password, so its layout was not compared.
//
// consts.php: the constants browser. Filters search_name, search_value, search_note and page / limit (a plain `search` is ignored).
// Item: {rowid, name, value, type, note, entity, redacted}; a secret (password, key, token ...) has value null and redacted true.
// 12 Nov 2026 (AN-168): each item also has `modified` (the row's tms, ISO, null when never set) and `visible`, and ?visible=1 narrows the list to the
// constants the classic admin/const.php lists. Read live: all 1,138 constants, ?visible=1 gives exactly 70 (the classic page's count). The Const tab asks
// for visible=1, so it lists what the classic page lists; the other constants are still reached by name through search_name (the settings switches).
export interface AdminModule {
  id: number
  className: string
  name: string
  description: string
  version: string
  versionStatus: string
  family: string
  publisher: string
  nature: string
  position: number
  enabled: boolean
}

export interface ModuleFilters {
  keyword: string
  nature: string
  version: string
  status: string
}

interface FapiModule {
  id: number
  class: string
  name: string
  description?: string
  version?: string
  version_status?: string
  family?: string
  publisher?: string
  nature?: string
  position?: number
  enabled?: boolean
}

export function useAdminModules(filters: ModuleFilters) {
  return useQuery({
    queryKey: ['settings', 'adminModules', filters],
    queryFn: async (): Promise<AdminModule[]> => {
      const d = await fapiGet<{ items?: FapiModule[] }>('/admin/fapi/modules.php', {
        search_keyword: filters.keyword || undefined,
        search_nature: filters.nature || undefined,
        search_version: filters.version || undefined,
        search_status: filters.status || undefined,
      })
      return (d.items ?? []).map((m) => ({
        id: m.id,
        className: m.class,
        name: m.name,
        description: m.description ?? '',
        version: m.version ?? '',
        versionStatus: m.version_status ?? '',
        family: m.family ?? '',
        publisher: m.publisher ?? '',
        nature: m.nature ?? '',
        position: m.position ?? 0,
        enabled: !!m.enabled,
      }))
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    retry: false,
  })
}

export interface AdminConstant {
  rowid: number
  name: string
  value: string | null
  type: string
  note: string
  entity: number
  // 1 = one of the constants the classic admin/const.php lists. const_save sets it to 0 when the request does not carry it (checked live 12 Nov 2026), so every
  // edit sends the value the row has, and the Add row of the Const tab sends 1 like the classic page.
  visible: number
  // The row's modification time as the API gives it (ISO), '' when it has none.
  modified: string
  redacted: boolean
}

export interface ConstantFilters {
  name: string
  value: string
  note: string
}

interface FapiConstant {
  rowid: number
  name: string
  value: string | null
  type?: string
  note?: string | null
  entity?: number
  visible?: number
  modified?: string | null
  redacted?: boolean
}

export function useAdminConstants(filters: ConstantFilters, page: number, limit: number) {
  return useQuery({
    queryKey: ['settings', 'adminConstants', filters, page, limit],
    queryFn: async (): Promise<{ items: AdminConstant[]; total: number }> => {
      const d = await fapiGet<{ items?: FapiConstant[]; pagination?: { total?: number } }>('/admin/fapi/consts.php', {
        search_name: filters.name || undefined,
        search_value: filters.value || undefined,
        search_note: filters.note || undefined,
        visible: 1,
        page,
        limit,
      })
      const items = (d.items ?? []).map((c) => ({ rowid: c.rowid, name: c.name, value: c.value, type: c.type ?? '', note: c.note ?? '', entity: c.entity ?? 0, visible: c.visible ?? 0, modified: c.modified ?? '', redacted: !!c.redacted }))
      return { items, total: Number(d.pagination?.total) || items.length }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

// ---- writers ---------------------------------------------------------------------------------------------------------------------
// admin/fapi/const_save.php and const_delete.php (#376, #377). Checked live on newecuenta 5 Nov 2026 with a throwaway constant (deleted again):
//  - save {name, value, note, type, entity}: creates or replaces. A replace gets a NEW rowid and a note that is not sent is BLANKED, so an edit always
//    sends the note and type it read; any type string is stored as given (yesno, string, chaine, texte ...); a MAIN_MODULE_* name answers 409
//    "Refusing to set a MAIN_MODULE_* flag here - use the module manager"; a bad name 422 "A valid constant name is required".
//  - delete {name}: 200 {deleted: [...], skipped: [...]}; a name that does not exist is still answered as deleted (nothing was there).
export const CONSTANT_NAME = /^[A-Za-z0-9_]+$/

export interface ConstantInput {
  name: string
  value: string
  note: string
  type?: string
  entity?: number
  visible?: number
}

export function useSaveConstant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ConstantInput) => {
      if (!CONSTANT_NAME.test(input.name)) throw new Error('A valid constant name is required (letters, digits, underscore).')
      return fapiPost<{ name: string; value: string | null; redacted: boolean }>('/admin/fapi/const_save.php', {
        name: input.name,
        value: input.value,
        note: input.note,
        ...(input.type ? { type: input.type } : {}),
        ...(input.entity ? { entity: input.entity } : {}),
        ...(input.visible !== undefined ? { visible: input.visible } : {}),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'adminConstants'] })
      void queryClient.invalidateQueries({ queryKey: ['settings', 'constants'] })
    },
  })
}

export function useDeleteConstant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => fapiPost<{ deleted: string[]; skipped: string[] }>('/admin/fapi/const_delete.php', { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'adminConstants'] })
      void queryClient.invalidateQueries({ queryKey: ['settings', 'constants'] })
    },
  })
}

// ---- menu entries -----------------------------------------------------------------------------------------------------------------
// admin/menus/fapi: menus.php (#378), menu_save.php (#379), menu_delete.php (#380), menu_move.php (#381); admin only, Menubase class.
// Checked live 5 Nov 2026 on an isolated throwaway handler "zztestfapi" (all deleted again; the real "all" handler stayed at 611 entries):
//  - menus.php?menu_handler=&type=&page=&limit= -> {items: [{id, menu_handler, type, mainmenu, leftmenu, fk_menu, position, url, target, title,
//    langs, perms, enabled, usertype, entity}], pagination, handlers: ["all"]}; 611 entries in "all" (26 top), the classic list shows them as a tree.
//  - save {rowid?, menu_handler, type, fk_menu, mainmenu, leftmenu, titre, url, langs, position, enabled, perms, target}: 201 {id}. An update with only
//    {rowid, titre} keeps the other fields. `usertype` (0 = Internal, 1 = External, 2 = All) was ignored on 5 Nov (always stored 0); the fix of
//    6 Nov 2026 (b7d517d0) was checked live with four throwaway entries (all deleted, the list back at 611): none sent -> 2, 0 -> 0, 1 -> 1, 2 -> 2.
//    The edit form always sends the value it shows, so saving an old entry (stored 0) does not change it.
//    An EMPTY body creates a blank entry (the endpoint does not validate), so the app never sends one without a type and a title.
//  - move {rowid, direction: up|down}: swaps the position with the neighbour; no neighbour -> 409 "Already at the top of its group."
//  - delete {rowid}: 200 {deleted_id}; an unknown id answers 409 with the database's own SQL error text.
export interface AdminMenu {
  id: number
  handler: string
  type: string
  mainmenu: string
  leftmenu: string
  parentId: number
  position: number
  url: string
  target: string
  title: string
  langs: string
  perms: string
  enabled: string
  usertype: number | null
}

interface FapiMenu {
  id: number
  menu_handler: string
  type: string
  mainmenu?: string
  leftmenu?: string
  fk_menu?: number
  position?: number
  url?: string
  target?: string
  title?: string
  langs?: string
  perms?: string
  enabled?: string
  usertype?: number
}

export function useAdminMenus(handler: string, type: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['settings', 'adminMenus', handler, type, page, limit],
    queryFn: async (): Promise<{ items: AdminMenu[]; total: number; handlers: string[] }> => {
      const d = await fapiGet<{ items?: FapiMenu[]; pagination?: { total?: number }; handlers?: string[] }>('/admin/menus/fapi/menus.php', {
        menu_handler: handler || 'all',
        type: type || undefined,
        page,
        limit,
      })
      const items = (d.items ?? []).map((m) => ({
        id: m.id,
        handler: m.menu_handler,
        type: m.type,
        mainmenu: m.mainmenu ?? '',
        leftmenu: m.leftmenu ?? '',
        parentId: m.fk_menu ?? 0,
        position: m.position ?? 0,
        url: m.url ?? '',
        target: m.target ?? '',
        title: m.title ?? '',
        langs: m.langs ?? '',
        perms: m.perms ?? '',
        enabled: m.enabled ?? '',
        usertype: m.usertype ?? null,
      }))
      return { items, total: Number(d.pagination?.total) || items.length, handlers: d.handlers ?? ['all'] }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  })
}

export interface MenuInput {
  id?: number
  handler: string
  type: string
  mainmenu: string
  leftmenu: string
  parentId: number
  title: string
  url: string
  langs: string
  position: number
  enabled: string
  perms: string
  target: string
  // 0 = Internal, 1 = External, 2 = All; left out when not known
  usertype?: number
}

export function useSaveMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MenuInput) => {
      // the endpoint saves an empty body as a blank entry, so what the classic form requires is checked here
      if (!input.type) throw new Error('Type is required.')
      if (!input.title.trim()) throw new Error('Title is required.')
      return fapiPost<{ action: string; id: number }>('/admin/menus/fapi/menu_save.php', {
        ...(input.id ? { rowid: input.id } : {}),
        menu_handler: input.handler || 'all',
        type: input.type,
        fk_menu: input.parentId,
        mainmenu: input.mainmenu,
        leftmenu: input.leftmenu,
        titre: input.title.trim(),
        url: input.url,
        langs: input.langs,
        position: input.position,
        enabled: input.enabled,
        perms: input.perms,
        target: input.target,
        ...(input.usertype !== undefined ? { usertype: input.usertype } : {}),
      })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['settings', 'adminMenus'] }),
  })
}

export function useMoveMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: 'up' | 'down' }) => fapiPost<unknown>('/admin/menus/fapi/menu_move.php', { rowid: id, direction }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['settings', 'adminMenus'] }),
  })
}

export function useDeleteMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => fapiPost<{ deleted_id: number }>('/admin/menus/fapi/menu_delete.php', { rowid: id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['settings', 'adminMenus'] }),
  })
}
