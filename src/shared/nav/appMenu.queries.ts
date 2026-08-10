import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

// GET /api/menu/ — real, computed by literally reusing Dolibarr's own
// menu-loading classes (core/class/menubase.class.php) and this theme's
// tree-building helper (core/menus/ecumenu/ecumenu.lib.php's
// ecumenu_build_tree()) for the CURRENT logged-in user — same permission
// (dol_eval on llx_menu.perms/enabled) and module-enabled filtering the
// real HTML sidebar itself uses, just serialized as JSON.
export interface BackendMenuNode {
  url: string
  titre: string
  level: number
  target: string
  leftmenu: string
  mainmenu: string
  children: BackendMenuNode[]
}
export interface BackendTopMenu {
  key: string
  title: string
  url: string
}
export interface AppMenuResponse {
  topMenus: BackendTopMenu[]
  sections: Record<string, BackendMenuNode[]>
}

export function useAppMenu() {
  return useQuery({
    queryKey: ['app-menu'],
    queryFn: async (): Promise<AppMenuResponse> => {
      const { data } = await api.get<{ success: boolean; data: AppMenuResponse }>('/menu/')
      // A queryFn must never resolve with undefined — React Query treats
      // that as a bug and logs "Query data cannot be undefined" on every
      // retry. A response shaped like { success: false, ... } (no `data`
      // field) hit that exact case here; throwing puts the query into its
      // normal isError state instead.
      if (!data?.data) throw new Error('Menu response did not include data')
      return data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
