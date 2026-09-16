import { Percent } from 'lucide-react'
import { DictListPage } from './DictListPage'

// admin/dict.php?id=10 — real, scraped rows (llx_c_tva) — see
// dolibarrDictParser.ts's own top comment. 11 real columns confirmed live
// (the previous column list here was a guess made before this page could
// be scraped at all, and undercounted by 2 — Local Tax 1/2 each split into
// a type + rate cell).
export function VatAccountsList() {
  return (
    <DictListPage
      icon={Percent}
      title="Vat Accounts"
      path="/admin/dict.php?id=10"
      columns={['Country', 'Code', 'Rate', 'Local Tax 1 Type', 'Local Tax 1', 'Local Tax 2 Type', 'Local Tax 2', 'NPR', 'Sale Account Code', 'Purchase Account Code', 'Note']}
    />
  )
}
