import { fapiGet } from '../../api/fapiEnvelope'

// payroll/fapi/<file>.php: the key-authenticated JSON mirror of the HRM pages (departments, designations,
// expenses, PAYE bands, setup, reports, ...). Same envelope as every fapi: {success, data, message, errors}; a failure arrives as
// a 4xx/5xx with the reason in `message`, which fapiGet turns into an Error.
export function hrmGet<T>(file: string, params?: Record<string, string | number | undefined>): Promise<T> {
  return fapiGet<T>(`/payroll/fapi/${file}.php`, params)
}
