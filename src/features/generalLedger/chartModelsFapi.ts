import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { DictRow } from './dolibarrDictParser'

// accountancy/fapi/coa_models.php (22 Oct 2026): the chart-of-accounts model dictionary (llx_accounting_system). Captured from newecuenta on
// 22 Oct 2026 (tests/fixtures/accountancy-coa-models.json): 37 models, one active. The table has no entity column, so writes affect every
// entity. activate / disable flip a model; delete is refused with 409 when accounts already use the chart.
const PATH = '/accountancy/fapi/coa_models.php'

export interface FapiCoaModels {
  items: Array<{ id: number; pcg_version: string; label: string; country_id: number; country_code: string; country: string; active: number }>
  pagination: { page: number; limit: number; total: number; pages: number }
}

// The columns of the page: code, label and country. The id is the row key the actions use.
export function mapCoaModels(d: FapiCoaModels): DictRow[] {
  return d.items.map((m) => ({ rowid: String(m.id), cells: [m.pcg_version, m.label, m.country], active: m.active === 1, toggleUrl: null, deleteUrl: null }))
}

export const loadCoaModels = async (): Promise<DictRow[]> => mapCoaModels(await fapiGet<FapiCoaModels>(PATH, { limit: 500 }))

export async function setCoaModelActive(rowid: string, active: boolean): Promise<void> {
  await fapiPost(PATH, { id: Number(rowid) }, { action: active ? 'activate' : 'disable' })
}

export async function deleteCoaModel(rowid: string): Promise<void> {
  await fapiPost(PATH, { id: Number(rowid) }, { action: 'delete' })
}
