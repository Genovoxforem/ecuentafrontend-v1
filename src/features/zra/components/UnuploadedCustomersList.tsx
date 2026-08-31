import { BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'

// The old /api/zra/customers/unuploaded/ this page used to call was for a
// different, inactive backend (ecnta10) — confirmed dead on the active one
// (api/zra/ 404s entirely). This page wasn't part of this pass's screenshot
// set, and a quick search for a real replacement (societe/*ajax* files)
// didn't turn up an obvious match the way the other ZRA lists did — left
// honest rather than guessed. Worth a dedicated follow-up look.
export function UnuploadedCustomersList() {
  return <BackendUnavailableCard feature="ZRA Un-Uploaded Customers/Vendor" />
}
