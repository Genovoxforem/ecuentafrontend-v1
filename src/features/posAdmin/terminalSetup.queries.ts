import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText, looksLikeLegacyLoginPageText } from '../../shared/legacyHtmlFetch'
import { parseTerminalSetup, type TerminalSetup } from './terminalSetupParser'

export function useTerminalSetup(terminal: 1 | 2) {
  return useQuery({
    queryKey: ['pos-admin', 'terminal-setup', terminal],
    queryFn: async (): Promise<TerminalSetup> => {
      const doc = await fetchLegacyDocument(`/takepos/admin/terminal.php`, new URLSearchParams({ terminal: String(terminal) }))
      if (looksLikeLegacyLoginPageText(doc.documentElement.outerHTML)) throw new Error('Not signed into the legacy backend.')
      return parseTerminalSetup(doc, terminal)
    },
    staleTime: 1000 * 15,
  })
}

export interface SaveTerminalSetupInput {
  terminal: 1 | 2
  token: string
  socid: string
  cash: string
  cheque: string
  cb: string
  bankCheque041: string
  bankTransfer051: string
  debitCard061: string
  mobileMoney071: string
  other081: string
  warehouseId: string
  forceDecreaseStock: '0' | '1'
  noDecreaseStock: '0' | '1'
  keycodeForEnter: string
  enablePasscode: '0' | '1'
  // Blank = "keep the existing passcode" (see terminalSetupParser.ts's own
  // comment on why the real field never echoes a saved value back).
  terminalPasscode: string
  connectorUrl: string
  scaleComPort: string
  scaleBaudRate: string
  assignUserId: string
  adminUserId: string
  header: string
  footer: string
}

// Real classic form-POST to takepos/admin/terminal.php?terminal=<n> — same
// field names, hidden token, and action=set as the real <form>, confirmed
// live (see terminalSetupParser.ts). No JSON endpoint exists for this
// write; this genuinely persists to the real backend the same way
// submitting the real form does, it's just not a REST API.
export function useSaveTerminalSetup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveTerminalSetupInput) => {
      const n = String(input.terminal)
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'set')
      body.set('socid', input.socid)
      body.set(`CASHDESK_ID_BANKACCOUNT_CASH${n}`, input.cash)
      body.set(`CASHDESK_ID_BANKACCOUNT_CHEQUE${n}`, input.cheque)
      body.set(`CASHDESK_ID_BANKACCOUNT_CB${n}`, input.cb)
      body.set('CASHDESK_ID_BANKACCOUNT_041', input.bankCheque041)
      body.set('CASHDESK_ID_BANKACCOUNT_051', input.bankTransfer051)
      body.set('CASHDESK_ID_BANKACCOUNT_061', input.debitCard061)
      body.set('CASHDESK_ID_BANKACCOUNT_071', input.mobileMoney071)
      body.set('CASHDESK_ID_BANKACCOUNT_081', input.other081)
      body.set(`CASHDESK_ID_WAREHOUSE${n}`, input.warehouseId)
      body.set('CASHDESK_FORCE_DECREASE_STOCK', input.forceDecreaseStock)
      body.set(`CASHDESK_NO_DECREASE_STOCK${n}`, input.noDecreaseStock)
      body.set(`CASHDESK_READER_KEYCODE_FOR_ENTER${n}`, input.keycodeForEnter)
      body.set(`TAKEPOS_ENABLE_PASSCODE${n}`, input.enablePasscode)
      body.set(`TAKEPOS_TERMINAL_PASSCODE${n}`, input.terminalPasscode)
      body.set(`CASHDESK_ID_CONNECTOR_URL${n}`, input.connectorUrl)
      body.set(`TAKEPOS_WEIGHING_SCALE_COM_PORT${n}`, input.scaleComPort)
      body.set(`TAKEPOS_WEIGHING_SCALE_BAUD_RATE${n}`, input.scaleBaudRate)
      body.set('search_user', input.assignUserId)
      body.set('admin_user', input.adminUserId)
      body.set(`TAKEPOS_HEADER${n}`, input.header)
      body.set(`TAKEPOS_FOOTER${n}`, input.footer)

      const text = await fetchLegacyText(`/takepos/admin/terminal.php?terminal=${n}`, { method: 'POST', body })
      return { ok: true, raw: text.length }
    },
    onSuccess: (_r, { terminal }) => {
      qc.invalidateQueries({ queryKey: ['pos-admin', 'terminal-setup', terminal] })
    },
  })
}
