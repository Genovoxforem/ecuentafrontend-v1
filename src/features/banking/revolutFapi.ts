import axios from 'axios'
import { fapi } from '../../api/axios'
import { requireJson } from '../salesOrders/orderApi'

// custom/revolut/fapi/sync.php (26 Oct 2026). Until six llx_bank_account columns exist it answers 409 with the columns and the ALTER statement;
// the structured answer is read from the error so the page can show it. Once the schema is there the GET answers {schema_ready: true, providers,
// accounts} (the fields of a provider / account are not documented).
export type RevolutStatus =
  | { ready: false; message: string; missingColumns: string[]; alterSql: string; hints: string[] }
  | { ready: true; providers: number; accounts: number }

interface Body {
  success?: boolean
  message?: string | null
  errors?: { missing_columns?: string[]; alter_sql_combined?: string; hint?: string[] }
  data?: { schema_ready?: boolean; providers?: unknown[]; accounts?: unknown[] } | null
}

export function mapRevolutStatus(b: Body): RevolutStatus {
  if (b.success === false || b.data?.schema_ready === false) {
    return {
      ready: false,
      message: b.message || 'Revolut sync is not available.',
      missingColumns: b.errors?.missing_columns ?? [],
      alterSql: b.errors?.alter_sql_combined ?? '',
      hints: b.errors?.hint ?? [],
    }
  }
  return { ready: true, providers: b.data?.providers?.length ?? 0, accounts: b.data?.accounts?.length ?? 0 }
}

export async function loadRevolutStatus(): Promise<RevolutStatus> {
  try {
    return mapRevolutStatus(requireJson(await fapi.get<Body>('/custom/revolut/fapi/sync.php')).data)
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 409 && e.response.data && typeof e.response.data === 'object') return mapRevolutStatus(e.response.data as Body)
    throw e
  }
}
