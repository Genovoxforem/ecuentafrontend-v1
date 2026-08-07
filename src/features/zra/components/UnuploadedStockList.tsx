import { Boxes } from 'lucide-react'
import { BackendUnavailable } from './ZraListChrome'

export function UnuploadedStockList() {
  return <BackendUnavailable icon={<Boxes size={20} className="text-brand" />} title="ZRA Un-Uploaded Stock" />
}
