import { loadFormOptions } from './pieceFapi'

// A journal's label is stored as a translation key ("ACCOUNTING_PURCHASE_JOURNAL", "FinanceJournal"); the classic pages print it translated
// ("Purchase journal", "Finance journal"). accountancy/fapi/journals_admin.php and closure_accounts.php return the stored key, while
// accountancy/fapi/create.php?action=form_options returns the translated name (read on newecuenta, 13 Nov 2026: AC "Purchase journal",
// BQ "Finance journal", OD "Miscellaneous journal", VT "Sell journal"...). The translated name is joined on the journal code; when the options
// cannot be read, or a journal is not in them, the stored label is kept.
export async function loadJournalNames(load: () => Promise<{ journals?: { code: string; label: string }[] }> = loadFormOptions): Promise<Map<string, string>> {
  try {
    const options = await load()
    return new Map((options.journals ?? []).map((j) => [j.code, j.label]))
  } catch {
    return new Map()
  }
}

export const translatedJournalLabel = (names: Map<string, string>, code: string, stored: string): string => names.get(code) ?? stored
