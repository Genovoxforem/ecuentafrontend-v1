import { BackendUnavailableCard } from '../../../shared/components/BackendUnavailable'

// This page has no real endpoint on either backend — no api/zra/products/unuploaded/
// route was ever built (unlike the other ZRA list pages, which lost their backend when
// the team switched to ecuenta9). Same honest "not available" card as the rest of the
// module, for consistency, rather than a bespoke local empty state.
export function UnuploadProductsList() {
  return <BackendUnavailableCard feature="ZRA Un-Upload Products" />
}
