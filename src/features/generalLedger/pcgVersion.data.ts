import { fapiGet } from '../../api/fapiEnvelope'
import type { LegacyCell, LegacyTable } from './legacyTable'

// accountancy/fapi/coa.php?action=pcg_version (key-authenticated, read-only), read live on newecuenta on 13 Nov 2026: the 37 chart versions of
// llx_accounting_system {active_chart_id, items [{id, pcg_version, label, country_id, country_code, country, active, selected}]}; the chart named by the
// CHARTOFACCOUNTS const carries selected:true (id 67 "Indian account" there). NOTE: the classic "Pcg_version" menu entry opened the list of the accounting
// accounts (admin/account.php); this endpoint is the list of chart versions, a different list (the accounts are on the Chart Of Accounts tree) - master report.
interface PcgItem {
  id: number
  pcg_version: string
  label: string
  country: string
  country_code: string
  active: number
  selected: boolean
}

const cell = (text: string | number): LegacyCell => ({ text: String(text), href: null, checkId: null })

export async function loadPcgVersions(): Promise<LegacyTable> {
  const d = await fapiGet<{ items: PcgItem[] }>('/accountancy/fapi/coa.php', { action: 'pcg_version' })
  return {
    headers: ['Version', 'Label', 'Country', 'Active', 'In use'],
    filters: [null, null, null, null, null],
    rows: d.items.map((i) => [cell(i.pcg_version), cell(i.label), cell(i.country_code ? `${i.country} (${i.country_code})` : i.country), cell(i.active ? 'Yes' : 'No'), cell(i.selected ? 'Yes' : '')]),
    totals: [],
    fields: {},
  }
}
