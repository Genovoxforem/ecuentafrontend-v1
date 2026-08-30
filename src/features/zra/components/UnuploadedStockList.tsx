import { BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'

// product/stock/movement_listunuploaded.php has no JSON API at all on the
// active backend — confirmed by reading it directly: no DataTables ajax
// config, no json_encode anywhere in the file. It's a classic
// server-rendered legacy page. The old /api/zra/stock-movements/unuploaded/
// this page used to call was for a different, inactive backend (ecnta10)
// and doesn't exist here either. Same honest "not available" card as
// UnuploadProductsList.tsx, rather than scraping the legacy HTML page.
export function UnuploadedStockList() {
  return <BackendUnavailableCard feature="ZRA Un-Uploaded Stock Movements" />
}
