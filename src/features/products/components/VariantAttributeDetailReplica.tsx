import { useParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// Native replacement for linking out to variants/card.php?id=X — no JSON
// API (confirmed by reading the PHP source directly). Fields below match
// that page's real form exactly (attribute name + its possible values
// list, per the real page's own "PossibleValues" section).
export function VariantAttributeDetailReplica() {
  const { id } = useParams<{ id: string }>()

  return (
    <DisabledFormPage
      icon={SlidersHorizontal}
      title={`Variant Attribute #${id}`}
      sourcePath={`variants/card.php?id=${id}`}
      sections={[
        { fields: [{ label: 'Ref', required: true }, { label: 'Attribute Name', required: true }] },
        { heading: 'Possible Values', fields: [{ label: 'Value' }] },
      ]}
    />
  )
}
