import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// accountancy/fapi/currency.php?action=dictionary: the full currency list (127 on newecuenta, 6 Nov 2026), the same codes as the classic
// admin/company.php currency select. Checked against that select: all 127 codes match, and 112 labels are identical once the symbol is added
// after the name ("Zambian Kwacha (ZMW)", "Afghanistan Afghani (؋)"). The other 15 (USD, EUR, GBP, INR, CAD, AUD, CHF, NOK, MUR, UAH, MAD, TND,
// XOF, XAF, XPF) print the translated name on the classic page ("US Dollars ($)") where the dictionary has the table name ("United States
// Dollar ($)"); the code is the same. The classic select is in the database's own order, which the answer does not carry: this list is in the
// answer's order (by name).
export interface CurrencyOption {
  code: string
  label: string
}

interface FapiCurrencyDictionary {
  base_currency: string
  count: number
  items: Array<{ code: string; label: string; symbol: string; is_base: boolean }>
}

// The symbol comes as a JSON list of character codes ("[75,77]"), empty when the currency has none: the classic list then prints the code.
const symbolOf = (c: { code: string; symbol: string }) => {
  try {
    const codes = JSON.parse(c.symbol) as number[]
    return Array.isArray(codes) && codes.length ? String.fromCodePoint(...codes) : c.code
  } catch {
    return c.code
  }
}

export const mapCurrencyDictionary = (d: FapiCurrencyDictionary): CurrencyOption[] => d.items.map((c) => ({ code: c.code, label: `${c.label} (${symbolOf(c)})` }))

export function useCurrencyDictionary() {
  return useQuery({
    queryKey: ['settings', 'currencyDictionary'],
    queryFn: async () => mapCurrencyDictionary(await fapiGet<FapiCurrencyDictionary>('/accountancy/fapi/currency.php', { action: 'dictionary' })),
    staleTime: 1000 * 60 * 60,
  })
}
