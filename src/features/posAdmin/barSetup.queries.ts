import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { selectValue, selectOptions, toggleChecked, csrfToken, type OptionRow } from './posAdminShared'

// takepos/admin/bar.php — 8 real toggles (TAKEPOS_BAR_RESTAURANT,
// TAKEPOS_ORDER_PRINTERS, TAKEPOS_ORDER_NOTES, TAKEPOS_PHONE_BASIC_LAYOUT,
// TAKEPOS_SUPPLEMENTS, TAKEPOS_MODIFIERS, TAKEPOS_QR_MENU,
// TAKEPOS_AUTO_ORDER, via core/ajax/constantonoff.php) plus 2 classic
// fields (TAKEPOS_SUPPLEMENTS_CATEGORY, TAKEPOS_MODIFIER_CATEGORY, no JSON
// equivalent, saved through <form action="bar.php" method="post">
// action=set). Floors & Tables management (Add floor/Add table/Generate
// Tables) has no dedicated AJAX endpoint found on this page — read-only
// here, with a link to the real page for that specific action, rather than
// guessing at a write contract. Same for "Order Printers (Setup)" →
// orderprinters.php, a separate real page not audited/built here.
export interface BarSetup {
  supplementsCategory: string
  modifierCategory: string
  categoryOptions: OptionRow[]
  barRestaurant: boolean
  orderPrinters: boolean
  orderNotes: boolean
  phoneBasicLayout: boolean
  supplements: boolean
  modifiers: boolean
  qrMenu: boolean
  autoOrder: boolean
  token: string
}

export function useBarSetup() {
  return useQuery({
    queryKey: ['pos-admin', 'bar-setup'],
    queryFn: async (): Promise<BarSetup> => {
      const doc = await fetchLegacyDocument('/takepos/admin/bar.php')
      return {
        supplementsCategory: selectValue(doc, 'TAKEPOS_SUPPLEMENTS_CATEGORY') || '-1',
        modifierCategory: selectValue(doc, 'TAKEPOS_MODIFIER_CATEGORY') || '-1',
        categoryOptions: selectOptions(doc, 'TAKEPOS_SUPPLEMENTS_CATEGORY'),
        barRestaurant: toggleChecked(doc, 'TAKEPOS_BAR_RESTAURANT'),
        orderPrinters: toggleChecked(doc, 'TAKEPOS_ORDER_PRINTERS'),
        orderNotes: toggleChecked(doc, 'TAKEPOS_ORDER_NOTES'),
        phoneBasicLayout: toggleChecked(doc, 'TAKEPOS_PHONE_BASIC_LAYOUT'),
        supplements: toggleChecked(doc, 'TAKEPOS_SUPPLEMENTS'),
        modifiers: toggleChecked(doc, 'TAKEPOS_MODIFIERS'),
        qrMenu: toggleChecked(doc, 'TAKEPOS_QR_MENU'),
        autoOrder: toggleChecked(doc, 'TAKEPOS_AUTO_ORDER'),
        token: csrfToken(doc),
      }
    },
    staleTime: 1000 * 15,
  })
}

export function useSaveBarSetup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; supplementsCategory: string; modifierCategory: string }) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'set')
      body.set('TAKEPOS_SUPPLEMENTS_CATEGORY', input.supplementsCategory)
      body.set('TAKEPOS_MODIFIER_CATEGORY', input.modifierCategory)
      await fetchLegacyText('/takepos/admin/bar.php', { method: 'POST', body })
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'bar-setup'] }),
  })
}
