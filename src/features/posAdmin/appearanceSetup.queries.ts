import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { csrfToken, constOn, constSelect, loadPosConsts, loadPosPage, requirePosSource, requirePosToken } from './posAdminShared'

// takepos/admin/appearance.php — real page has 2 real toggles
// (TAKEPOS_HIDE_CATEGORY_IMAGES, TAKEPOS_HIDE_PRODUCT_IMAGES, via
// core/ajax/constantonoff.php) plus 2 classic fields with no JSON
// equivalent (TAKEPOS_COLOR_THEME, TAKEPOS_LINES_TO_SHOW) saved through
// <form action="appearance.php?terminal=1" method="post"> action=set.
export interface AppearanceSetup {
  colorTheme: string
  linesToShow: string
  hideCategoryImages: boolean
  hideProductImages: boolean
  token: string
}

export function useAppearanceSetup() {
  return useQuery({
    queryKey: ['pos-admin', 'appearance-setup'],
    queryFn: async (): Promise<AppearanceSetup> => {
      const [consts, doc] = await Promise.all([loadPosConsts(), loadPosPage('/takepos/admin/appearance.php')])
      requirePosSource(consts, doc)
      return {
        colorTheme: constSelect(consts, doc, 'TAKEPOS_COLOR_THEME', '0'),
        linesToShow: constSelect(consts, doc, 'TAKEPOS_LINES_TO_SHOW', '2'),
        hideCategoryImages: constOn(consts, doc, 'TAKEPOS_HIDE_CATEGORY_IMAGES'),
        hideProductImages: constOn(consts, doc, 'TAKEPOS_HIDE_PRODUCT_IMAGES'),
        token: doc ? csrfToken(doc) : '',
      }
    },
    staleTime: 1000 * 15,
  })
}

export function useSaveAppearanceSetup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; colorTheme: string; linesToShow: string }) => {
      requirePosToken(input.token)
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'set')
      body.set('TAKEPOS_COLOR_THEME', input.colorTheme)
      body.set('TAKEPOS_LINES_TO_SHOW', input.linesToShow)
      await fetchLegacyText('/takepos/admin/appearance.php?terminal=1', { method: 'POST', body })
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'appearance-setup'] }),
  })
}
