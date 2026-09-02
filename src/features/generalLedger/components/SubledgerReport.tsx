import { ListTree } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// accountancy/bookkeeping/listbysubaccount.php — confirmed real (llx_
// accounting_bookkeeping data grouped by subledger/third-party account) but
// no JSON API. The one real JSON endpoint this module does have
// (listbyaccount_ajax_api.php, now powering the Ledger Dashboard) supports
// subledger_account filter keys in its internal query-builder, but no
// request parameter anywhere in that file actually populates them — so
// there is no reachable way to drive a real subledger-grouped view through
// it today, despite the underlying capability existing in the code. Fields
// below match the real report's own filter and column set.
export function SubledgerReport() {
  return (
    <DisabledFormPage
      icon={ListTree}
      title="Subledger"
      sourcePath="accountancy/bookkeeping/listbysubaccount.php"
      sections={[
        { fields: [{ label: 'Subledger Account', type: 'select', required: true }, { label: 'Date Export', type: 'date' }] },
        {
          heading: 'Movements',
          fields: [{ label: 'Journal Code' }, { label: 'Document Date' }, { label: 'Label' }, { label: 'Debit' }, { label: 'Credit' }],
        },
      ]}
    />
  )
}
