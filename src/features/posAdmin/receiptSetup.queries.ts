import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { selectValue, inputValue, textareaValue, toggleChecked, csrfToken } from './posAdminShared'

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
      const doc = await fetchLegacyDocument('/takepos/admin/receipt.php')
      const html = doc.documentElement.outerHTML
      const hasReceiptPrinterLink = /action=setmethod[^"]*value=receiptprinter/.test(html)
      const hasConnectorLink = /action=setmethod[^"]*value=takeposconnector/.test(html)
      const activeMethod: PrintMethod = !hasReceiptPrinterLink ? 'receiptprinter' : !hasConnectorLink ? 'takeposconnector' : 'browser'
      return {
        header: textareaValue(doc, 'TAKEPOS_HEADER'),
        footer: textareaValue(doc, 'TAKEPOS_FOOTER'),
        receiptName: inputValue(doc, 'TAKEPOS_RECEIPT_NAME'),
        showCustomer: (selectValue(doc, 'TAKEPOS_SHOW_CUSTOMER') || '0') as '0' | '1',
        printPaymentMethod: (selectValue(doc, 'TAKEPOS_PRINT_PAYMENT_METHOD') || '0') as '0' | '1',
        autoPrintTickets: (selectValue(doc, 'TAKEPOS_AUTO_PRINT_TICKETS') || '0') as '0' | '1',
        vatGrouped: toggleChecked(doc, 'TAKEPOS_TICKET_VAT_GROUPPED'),
        activeMethod,
        token: csrfToken(doc),
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
      await fetchLegacyText(`/takepos/admin/receipt.php?action=setmethod&token=${encodeURIComponent(token)}&value=${value}`)
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-admin', 'receipt-setup'] }),
  })
}
