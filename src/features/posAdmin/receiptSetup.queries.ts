import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { inputValue, textareaValue, csrfToken, constOn, constSelect, constText, loadPosConsts, loadPosPage, requirePosSource, requirePosToken } from './posAdminShared'

export type PrintMethod = 'browser' | 'receiptprinter' | 'takeposconnector'

// takepos/admin/receipt.php — 1 real toggle (TAKEPOS_TICKET_VAT_GROUPPED)
// plus 6 classic fields (TAKEPOS_HEADER/FOOTER/RECEIPT_NAME/SHOW_CUSTOMER/
// PRINT_PAYMENT_METHOD/AUTO_PRINT_TICKETS, no JSON equivalent) and a
// separate real GET action for the active print method
// (?action=setmethod&value=receiptprinter|takeposconnector — confirmed
// live: whichever method is currently active has no switch-link of its
// own, the other two do).
export interface ReceiptSetup {
  header: string
  footer: string
  receiptName: string
  showCustomer: '0' | '1'
  printPaymentMethod: '0' | '1'
  autoPrintTickets: '0' | '1'
  vatGrouped: boolean
  activeMethod: PrintMethod
  token: string
}

export function useReceiptSetup() {
  return useQuery({
    queryKey: ['pos-admin', 'receipt-setup'],
    queryFn: async (): Promise<ReceiptSetup> => {
      const [consts, doc] = await Promise.all([loadPosConsts(), loadPosPage('/takepos/admin/receipt.php')])
      requirePosSource(consts, doc)
      // The print method in use: TAKEPOS_PRINT_METHOD (browser | receiptprinter | takeposconnector; "browser" on newecuenta, where the
      // classic page shows a switch link to both of the others). Without the constant: the page's links (no link = the active one).
      const html = doc?.documentElement.outerHTML ?? ''
      const hasReceiptPrinterLink = /action=setmethod[^"]*value=receiptprinter/.test(html)
      const hasConnectorLink = /action=setmethod[^"]*value=takeposconnector/.test(html)
      const method = consts?.TAKEPOS_PRINT_METHOD
      const activeMethod: PrintMethod =
        method === 'receiptprinter' || method === 'takeposconnector' || method === 'browser'
          ? method
          : !hasReceiptPrinterLink && doc
            ? 'receiptprinter'
            : !hasConnectorLink && doc
              ? 'takeposconnector'
              : 'browser'
      return {
        header: constText(consts, doc, 'TAKEPOS_HEADER', textareaValue),
        footer: constText(consts, doc, 'TAKEPOS_FOOTER', textareaValue),
        receiptName: constText(consts, doc, 'TAKEPOS_RECEIPT_NAME', inputValue),
        showCustomer: constSelect(consts, doc, 'TAKEPOS_SHOW_CUSTOMER', '0') as '0' | '1',
        printPaymentMethod: constSelect(consts, doc, 'TAKEPOS_PRINT_PAYMENT_METHOD', '0') as '0' | '1',
        autoPrintTickets: constSelect(consts, doc, 'TAKEPOS_AUTO_PRINT_TICKETS', '0') as '0' | '1',
        vatGrouped: constOn(consts, doc, 'TAKEPOS_TICKET_VAT_GROUPPED'),
        activeMethod,
        token: doc ? csrfToken(doc) : '',
      }
    },
    staleTime: 1000 * 15,
  })
}

export interface SaveReceiptInput {
  token: string
  header: string
  footer: string
  receiptName: string
  showCustomer: '0' | '1'
  printPaymentMethod: '0' | '1'
  autoPrintTickets: '0' | '1'
}
export function useSaveReceiptSetup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveReceiptInput) => {
      requirePosToken(input.token)
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'set')
      body.set('TAKEPOS_HEADER', input.header)
      body.set('TAKEPOS_FOOTER', input.footer)
      body.set('TAKEPOS_RECEIPT_NAME', input.receiptName)
      body.set('TAKEPOS_SHOW_CUSTOMER', input.showCustomer)
      body.set('TAKEPOS_PRINT_PAYMENT_METHOD', input.printPaymentMethod)
      body.set('TAKEPOS_AUTO_PRINT_TICKETS', input.autoPrintTickets)
      await fetchLegacyText('/takepos/admin/receipt.php?terminal=1', { method: 'POST', body })
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'receipt-setup'] }),
  })
}

// Real GET action link — same one the real page's own row-status icons use.
export function useSetPrintMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ token, value }: { token: string; value: 'receiptprinter' | 'takeposconnector' }) => {
      requirePosToken(token)
      await fetchLegacyText(`/takepos/admin/receipt.php?action=setmethod&token=${encodeURIComponent(token)}&value=${value}`)
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'receipt-setup'] }),
  })
}
