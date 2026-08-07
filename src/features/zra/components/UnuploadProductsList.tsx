import { Package } from 'lucide-react'
import { BackendUnavailable } from './ZraListChrome'

export function UnuploadProductsList() {
  return <BackendUnavailable icon={<Package size={20} className="text-brand" />} title="ZRA Un-Upload Products" />
}
