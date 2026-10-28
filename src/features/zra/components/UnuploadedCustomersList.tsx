import { BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'

// There is no /api/zra/ on the active backend (it 404s entirely), and no
// replacement source for unuploaded customers has been found.
export function UnuploadedCustomersList() {
  return <BackendUnavailableCard feature="ZRA Un-Uploaded Customers/Vendor" />
}
