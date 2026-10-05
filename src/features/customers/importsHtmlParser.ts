// Parses the legacy generic import wizard's Step 1 page (imports/import.php,
// no REST API exists) — a plain bordered table (class names change between
// backend versions, so it is never selected by class), one <tr class="oddeven">
// per importable dataset: td[0]=module name, td[1]=icon+label, td[2]=a link to
// Step 2 carrying the real `datatoimport` code as a query param (e.g.
// "societe_1"). Rows are recognised by that link, which is what the wizard
// itself follows — see imports/import.php, the `foreach ($sortedarrayofmodules
// as $key => $value)` loop.

export interface ImportDataset {
  module: string
  label: string
  code: string
}

const DATASET_LINK = 'a[href*="datatoimport="]'

export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector(`tr.oddeven ${DATASET_LINK}`) && !!doc.querySelector('input[name="password"]')
}

export function parseImportDatasets(doc: Document): ImportDataset[] {
  const out: ImportDataset[] = []
  const rows = doc.querySelectorAll('tr.oddeven')
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td')
    if (cells.length < 3) return
    const module = cells[0]?.textContent?.trim()
    const label = cells[1]?.textContent?.trim()
    const href = cells[2]?.querySelector(DATASET_LINK)?.getAttribute('href')
    if (!module || !label || !href) return
    const code = new URL(href, window.location.origin).searchParams.get('datatoimport')
    if (!code) return
    out.push({ module, label, code })
  })
  return out
}
