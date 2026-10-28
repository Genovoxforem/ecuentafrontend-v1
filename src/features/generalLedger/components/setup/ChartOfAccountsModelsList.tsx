import { BookMarked } from 'lucide-react'
import { DictListPage } from './DictListPage'
import { deleteCoaModel, loadCoaModels, setCoaModelActive } from '../../chartModelsFapi'

// accountancy/fapi/coa_models.php — "Chart of accounts models"
// (llx_accounting_system): columns Code / Label / Country, and exactly one
// model activated. Enable / disable and delete go by row id. Same generic
// dictionary list as the other setup lists (DictListPage).
export function ChartOfAccountsModelsList() {
  return <DictListPage icon={BookMarked} title="Chart Of Accounts Models" path="/accountancy/admin/accountmodel.php?id=31" columns={['Chart Of Accounts Models', 'Label', 'Country']} source={{ load: loadCoaModels, setActive: setCoaModelActive, remove: deleteCoaModel }} />
}
