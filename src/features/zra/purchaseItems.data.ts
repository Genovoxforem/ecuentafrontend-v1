import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'

// "View Invoice" on ZRA > Automatic Purchase: the item details of one purchase, read from custom/zra/getpurchasesmodel.php?invoiceno=<row id>
// (the id is the button's data-invoice-id in getpurchases_ajax.php). There is no JSON for it: the page answers an HTML fragment (60 KB for a
// 5-item invoice on 5.10, read 13 Nov 2026) whose cells carry stable ids (`itemcode_<invoice>_<n>`, `vattaxable_...`, `toTaL_...`), so the
// reader looks those ids up and never depends on the layout. Read only: the classic drawer's link / remove-product buttons are not offered.

export interface PurchaseItem {
  sequence: string
  name: string
  productHref: string
  itemCode: string
  classCode: string
  quantity: string
  packageQuantity: string
  quantityUnit: string
  packageUnit: string
  vatCode: string
  ipl: string
  tl: string
  excise: string
  vatTaxable: string
  iplTaxable: string
  tlTaxable: string
  exciseTaxable: string
  vatTax: string
  iplTax: string
  tlTax: string
  exciseTax: string
  price: string
  supplyAmount: string
  discount: string
  total: string
  zraStatus: string
}

export interface PurchaseItemsDetails {
  invoiceNo: string
  supplierName: string
  supplierTpin: string
  supplierBranch: string
  // The badge next to the supplier ("Supplier Name or Tpin Already Exists").
  supplierNote: string
  items: PurchaseItem[]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

export function parsePurchaseItems(doc: Document): PurchaseItemsDetails {
  const text = (root: ParentNode, prefix: string) => clean(root.querySelector(`[id^="${prefix}"]`)?.textContent)
  const supplier = doc.querySelector('[id^="supplierdet_"]')
  const invoiceNo = (supplier as HTMLInputElement | null)?.value ?? clean(doc.querySelector('h5.dialog-title')?.textContent).replace(/^Invoice No\s*:\s*/i, '').replace(/\s*-\s*Item Details$/i, '')
  const items: PurchaseItem[] = []
  for (const tr of Array.from(doc.querySelectorAll('table tbody tr'))) {
    const cells = tr.querySelectorAll(':scope > td')
    if (cells.length < 10) continue
    items.push({
      sequence: clean(cells[0].textContent),
      name: text(tr, 'productname_') || clean(cells[1].firstChild?.textContent),
      productHref: tr.querySelector('[id^="productname_"]')?.getAttribute('href') ?? '',
      itemCode: text(tr, 'itemcode_'),
      classCode: text(tr, 'classcode_'),
      quantity: text(tr, 'qty_'),
      packageQuantity: /\/\s*([\d.]+)/.exec(clean(cells[2].textContent))?.[1] ?? '',
      quantityUnit: text(tr, 'qtyunit_'),
      packageUnit: text(tr, 'pkgunit_'),
      vatCode: text(tr, 'vatcode_'),
      ipl: text(tr, 'ipl_'),
      tl: text(tr, 'tl_'),
      excise: text(tr, 'excise_'),
      vatTaxable: text(tr, 'vattaxable_'),
      iplTaxable: text(tr, 'ipltaxable_'),
      tlTaxable: text(tr, 'tltaxable_'),
      exciseTaxable: text(tr, 'excisetaxable_'),
      vatTax: text(tr, 'vattax_'),
      iplTax: text(tr, 'ipltax_'),
      tlTax: text(tr, 'tltax_'),
      exciseTax: text(tr, 'excisetax_'),
      price: text(tr, 'itemPrice_'),
      supplyAmount: text(tr, 'suplyAmnt_'),
      discount: text(tr, 'dcRt_'),
      total: text(tr, 'toTaL_'),
      zraStatus: clean(cells[cells.length - 1].querySelector('.badge')?.textContent),
    })
  }
  return {
    invoiceNo,
    supplierName: text(doc, 'supplierName_'),
    supplierTpin: text(doc, 'supplierTpin_'),
    supplierBranch: text(doc, 'supplierBranch_'),
    supplierNote: clean(doc.querySelector('.text-end .badge')?.textContent),
    items,
  }
}

export async function loadPurchaseItems(invoiceId: number): Promise<PurchaseItemsDetails> {
  const doc = await fetchLegacyDocument('/custom/zra/getpurchasesmodel.php', new URLSearchParams({ invoiceno: String(invoiceId) }))
  // An unknown id answers one alert: <div class="alert theme-warning">Purchase not found</div>
  const alert = clean(doc.querySelector('.alert')?.textContent)
  if (alert && !doc.querySelector('table')) throw new Error(alert)
  return parsePurchaseItems(doc)
}

export function usePurchaseItems(invoiceId: number | null) {
  return useQuery({
    queryKey: ['zra', 'purchaseItems', invoiceId],
    queryFn: () => loadPurchaseItems(invoiceId as number),
    enabled: invoiceId !== null,
    staleTime: 1000 * 60,
    retry: false,
  })
}
