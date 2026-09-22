import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { selectValue, selectOptions, toggleChecked, csrfToken, type OptionRow } from './posAdminShared'

// takepos/admin/setup.php — real page has 9 real toggles (CASHDESK_SERVICES
// "Selling services", ECUENTA_POS_ENABLED, TAKEPOS_CONTROL_CASH_OPENING,
// TAKEPOS_DELAYED_PAYMENT, TAKEPOS_DIRECT_PAYMENT, TAKEPOS_GIFT_RECEIPT,
// TAKEPOS_GROUP_SAME_PRODUCT, TAKEPOS_ONSCREEN_KEYBOARD,
// TAKEPOS_QUICK_SYNCHRONIZE — all via core/ajax/constantonoff.php) plus 5
// classic fields (no JSON equivalent, saved through <form
// action="setup.php" method="post"> action=set) and the numbering module,
// which is neither a toggle nor a form field — it's a real GET action link
// (?action=setrefmod&value=mod_takepos_ref_simple) that only exists for
// the currently-INACTIVE module (confirmed live: no link renders for
// whichever module is already active).
export interface ParametersSetup {
  numTerminals: string
  rootCategoryId: string
  sortProductField: string
  numpad: string
  emailTemplate: string
  rootCategoryOptions: OptionRow[]
  sortProductFieldOptions: OptionRow[]
  numpadOptions: OptionRow[]
  emailTemplateOptions: OptionRow[]
  // 'mod_takepos_ref_simple' when Simple is active (Universal has no real
  // switch-link the other way on this backend, since Universal appears to
  // be the only other real module and is already active whenever Simple
  // isn't) — real, not guessed: read directly from the page's own link.
  activeNumberingModule: 'mod_takepos_ref_simple' | 'other'
  cashdeskServices: boolean
  ecuentaPosEnabled: boolean
  controlCashOpening: boolean
  delayedPayment: boolean
  directPayment: boolean
  giftReceipt: boolean
  groupSameProduct: boolean
  onscreenKeyboard: boolean
  quickSynchronize: boolean
  token: string
}

export function useParametersSetup() {
  return useQuery({
    queryKey: ['pos-admin', 'parameters-setup'],
    queryFn: async (): Promise<ParametersSetup> => {
      const doc = await fetchLegacyDocument('/takepos/admin/setup.php')
      const hasSimpleSwitchLink = /action=setrefmod[^"]*value=mod_takepos_ref_simple/.test(doc.documentElement.outerHTML)
      return {
        numTerminals: selectValue(doc, 'TAKEPOS_NUM_TERMINALS') || '1',
        rootCategoryId: selectValue(doc, 'TAKEPOS_ROOT_CATEGORY_ID') || '-1',
        sortProductField: selectValue(doc, 'TAKEPOS_SORTPRODUCTFIELD') || 'rowid',
        numpad: selectValue(doc, 'TAKEPOS_NUMPAD') || '0',
        emailTemplate: selectValue(doc, 'TAKEPOS_EMAIL_TEMPLATE_INVOICE') || '-1',
        rootCategoryOptions: selectOptions(doc, 'TAKEPOS_ROOT_CATEGORY_ID'),
        sortProductFieldOptions: selectOptions(doc, 'TAKEPOS_SORTPRODUCTFIELD'),
        numpadOptions: selectOptions(doc, 'TAKEPOS_NUMPAD'),
        emailTemplateOptions: selectOptions(doc, 'TAKEPOS_EMAIL_TEMPLATE_INVOICE'),
        // A visible switch-link to Simple means Universal is currently active.
        activeNumberingModule: hasSimpleSwitchLink ? 'other' : 'mod_takepos_ref_simple',
        cashdeskServices: toggleChecked(doc, 'CASHDESK_SERVICES'),
        ecuentaPosEnabled: toggleChecked(doc, 'ECUENTA_POS_ENABLED'),
        controlCashOpening: toggleChecked(doc, 'TAKEPOS_CONTROL_CASH_OPENING'),
        delayedPayment: toggleChecked(doc, 'TAKEPOS_DELAYED_PAYMENT'),
        directPayment: toggleChecked(doc, 'TAKEPOS_DIRECT_PAYMENT'),
        giftReceipt: toggleChecked(doc, 'TAKEPOS_GIFT_RECEIPT'),
        groupSameProduct: toggleChecked(doc, 'TAKEPOS_GROUP_SAME_PRODUCT'),
        onscreenKeyboard: toggleChecked(doc, 'TAKEPOS_ONSCREEN_KEYBOARD'),
        quickSynchronize: toggleChecked(doc, 'TAKEPOS_QUICK_SYNCHRONIZE'),
        token: csrfToken(doc),
      }
    },
    staleTime: 1000 * 15,
  })
}

export interface SaveParametersInput {
  token: string
  numTerminals: string
  rootCategoryId: string
  sortProductField: string
  numpad: string
  emailTemplate: string
}
export function useSaveParametersSetup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveParametersInput) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'set')
      body.set('TAKEPOS_NUM_TERMINALS', input.numTerminals)
      body.set('TAKEPOS_ROOT_CATEGORY_ID', input.rootCategoryId)
      body.set('TAKEPOS_SORTPRODUCTFIELD', input.sortProductField)
      body.set('TAKEPOS_NUMPAD', input.numpad)
      body.set('TAKEPOS_EMAIL_TEMPLATE_INVOICE', input.emailTemplate)
      await fetchLegacyText('/takepos/admin/setup.php', { method: 'POST', body })
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'parameters-setup'] }),
  })
}

// Real GET action link — switches the active numbering module. No form
// involved, matches the real page's own plain <a href> exactly.
export function useSwitchNumberingModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      await fetchLegacyText(`/takepos/admin/setup.php?action=setrefmod&token=${encodeURIComponent(token)}&value=mod_takepos_ref_simple`)
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'parameters-setup'] }),
  })
}
