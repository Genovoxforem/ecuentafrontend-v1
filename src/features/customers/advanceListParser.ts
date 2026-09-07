// Parses rows from compta/facture/advancelist_ajax.php — the real, working
// DataTables JSON endpoint behind compta/facture/advance_list.php (read
// directly). Several cells are Dolibarr's usual getNomUrl()-rendered HTML
// fragments (a real, live convention already relied on the same way for
// Quotations/Purchase Orders elsewhere in this app — see
// quotationListParser.ts) — parsing one already-real JSON field's small
// embedded anchor for its text/href isn't page-scraping, it's the same
// technique already established there.

export interface RawAdvanceListRow {
  cust_name: string // Facture::getNomUrl(1, 'advance', ...) — the advance's own ref link
  currency: string // mislabeled by the real PHP itself — actually dol_print_date(date_creation, 'day')
  contact: string // Societe::getNomUrl(1, 'customer') — the third party
  cust_type: string // form_modes_reglement_listpage(...) — payment mode label
  tot_amount: string // price(total_ht) — plain formatted amount, no markup
  author: string // User::getNomUrl(-1)
  action: string // real View/Download PDF receipt <a> tags
}

export interface AdvanceListRow {
  ref: string
  date: string
  thirdPartyName: string
  paymentType: string
  totalAdvance: number
  author: string
  viewUrl: string | null
  downloadUrl: string | null
}

function parseFragment(html: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  return wrapper
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseAmount(raw: string): number {
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

// `action`: two real <a class="butAction"> tags built directly from
// DOL_URL_ROOT.'/comm/advance_receipt_pdf.php?id='.$advance_id — the second
// with '&action=download' appended, read directly from advancelist_ajax.php.
function parseAction(html: string): { viewUrl: string | null; downloadUrl: string | null } {
  const root = parseFragment(html)
  const anchors = Array.from(root.querySelectorAll('a'))
  const viewUrl = anchors.find((a) => !a.getAttribute('href')?.includes('action=download'))?.getAttribute('href') ?? null
  const downloadUrl = anchors.find((a) => a.getAttribute('href')?.includes('action=download'))?.getAttribute('href') ?? null
  return { viewUrl, downloadUrl }
}

export function parseAdvanceListRow(raw: RawAdvanceListRow): AdvanceListRow {
  const { viewUrl, downloadUrl } = parseAction(raw.action)
  return {
    ref: text(parseFragment(raw.cust_name)),
    date: raw.currency ?? '',
    thirdPartyName: text(parseFragment(raw.contact)),
    paymentType: text(parseFragment(raw.cust_type)),
    totalAdvance: parseAmount(raw.tot_amount ?? ''),
    author: text(parseFragment(raw.author)),
    viewUrl,
    downloadUrl,
  }
}
