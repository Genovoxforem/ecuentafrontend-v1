import { useLocation } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { NotBuiltPage } from '../../shared/components/dashboard/NotBuiltPage'
import { FIXED_ASSET_PLACEHOLDERS } from '../../features/fixedAsset/fixedAssetPlaceholders'

export function FixedAssetPlaceholderModule() {
  const { pathname } = useLocation()
  const entry = FIXED_ASSET_PLACEHOLDERS.find((p) => p.path === pathname)
  if (!entry) return <NotBuiltPage icon={HelpCircle} title="Unknown Fixed Asset page" description="No placeholder entry found for this route." />
  return <NotBuiltPage icon={entry.icon} title={entry.title} description={entry.description} />
}
