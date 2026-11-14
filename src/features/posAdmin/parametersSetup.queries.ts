import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { selectOptions, currentOnly, csrfToken, constOn, constSelect, loadPosConsts, loadPosPage, requirePosSource, requirePosToken, type OptionRow } from './posAdminShared'

// takepos/admin/setup.php — the page has 9 toggles (CASHDESK_SERVICES
// "Selling services", ECUENTA_POS_ENABLED, TAKEPOS_CONTROL_CASH_OPENING,
// TAKEPOS_DELAYED_PAYMENT, TAKEPOS_DIRECT_PAYMENT, TAKEPOS_GIFT_RECEIPT,
// TAKEPOS_GROUP_SAME_PRODUCT, TAKEPOS_ONSCREEN_KEYBOARD,
// TAKEPOS_QUICK_SYNCHRONIZE — all via core/ajax/constantonoff.php) plus 5
// classic fields (no JSON equivalent, saved through <form
// action="setup.php" method="post"> action=set) and the numbering module,
// which is neither a toggle nor a form field — it's a GET action link
// (?action=setrefmod&value=mod_takepos_ref_simple) that only exists for
// the currently-INACTIVE module (no link renders for whichever module is
// already active).
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
      const [consts, doc] = await Promise.all([loadPosConsts(), loadPosPage('/takepos/admin/setup.php')])
      requirePosSource(consts, doc)
      // The numbering module in use: from TAKEPOS_REF_ADDON; the classic page shows a switch link to Simple only while Universal is active
      // (checked live on newecuenta 5 Nov 2026: the constant is mod_takepos_ref_universal and the link is there).
      const hasSimpleSwitchLink = doc ? /action=setrefmod[^"]*value=mod_takepos_ref_simple/.test(doc.documentElement.outerHTML) : false
      const activeNumberingModule: ParametersSetup['activeNumberingModule'] = consts
        ? consts.TAKEPOS_REF_ADDON === 'mod_takepos_ref_simple'
          ? 'mod_takepos_ref_simple'
          : 'other'
        : hasSimpleSwitchLink
          ? 'other'
          : 'mod_takepos_ref_simple'
      return {
        numTerminals: constSelect(consts, doc, 'TAKEPOS_NUM_TERMINALS', '1'),
        rootCategoryId: constSelect(consts, doc, 'TAKEPOS_ROOT_CATEGORY_ID', '-1'),
        sortProductField: constSelect(consts, doc, 'TAKEPOS_SORTPRODUCTFIELD', 'rowid'),
        numpad: constSelect(consts, doc, 'TAKEPOS_NUMPAD', '0'),
        emailTemplate: constSelect(consts, doc, 'TAKEPOS_EMAIL_TEMPLATE_INVOICE', '-1'),
        rootCategoryOptions: doc ? selectOptions(doc, 'TAKEPOS_ROOT_CATEGORY_ID') : currentOnly(constSelect(consts, doc, 'TAKEPOS_ROOT_CATEGORY_ID', '')),
        sortProductFieldOptions: doc ? selectOptions(doc, 'TAKEPOS_SORTPRODUCTFIELD') : currentOnly(constSelect(consts, doc, 'TAKEPOS_SORTPRODUCTFIELD', '')),
        numpadOptions: doc ? selectOptions(doc, 'TAKEPOS_NUMPAD') : currentOnly(constSelect(consts, doc, 'TAKEPOS_NUMPAD', '')),
        emailTemplateOptions: doc ? selectOptions(doc, 'TAKEPOS_EMAIL_TEMPLATE_INVOICE') : currentOnly(constSelect(consts, doc, 'TAKEPOS_EMAIL_TEMPLATE_INVOICE', '')),
        activeNumberingModule,
        cashdeskServices: constOn(consts, doc, 'CASHDESK_SERVICES'),
        ecuentaPosEnabled: constOn(consts, doc, 'ECUENTA_POS_ENABLED'),
        controlCashOpening: constOn(consts, doc, 'TAKEPOS_CONTROL_CASH_OPENING'),
        delayedPayment: constOn(consts, doc, 'TAKEPOS_DELAYED_PAYMENT'),
        directPayment: constOn(consts, doc, 'TAKEPOS_DIRECT_PAYMENT'),
        giftReceipt: constOn(consts, doc, 'TAKEPOS_GIFT_RECEIPT'),
        groupSameProduct: constOn(consts, doc, 'TAKEPOS_GROUP_SAME_PRODUCT'),
        onscreenKeyboard: constOn(consts, doc, 'TAKEPOS_ONSCREEN_KEYBOARD'),
        quickSynchronize: constOn(consts, doc, 'TAKEPOS_QUICK_SYNCHRONIZE'),
        token: doc ? csrfToken(doc) : '',
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
      requirePosToken(input.token)
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
      requirePosToken(token)
      await fetchLegacyText(`/takepos/admin/setup.php?action=setrefmod&token=${encodeURIComponent(token)}&value=mod_takepos_ref_simple`)
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'parameters-setup'] }),
  })
}
