import { useParams } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'
import { useUserGroupsList } from '../userGroupsAndTags.queries'

const PERMISSION_MODULES = ['Products', 'Sales Orders', 'Purchase Orders', 'Warehouses', 'Banking', 'Payroll', 'Expenses', 'Tickets', 'Members', 'Fixed Assets', 'Users & Groups', 'ZRA']

// Native replacement for linking out to user/group/card.php?id=X — the
// real permissions matrix (one read/write/delete checkbox set per enabled
// module, confirmed by reading the PHP source) has no JSON API at all
// (user/group/ajax_group.php only supports action=create_group). Showing
// the real group name plus the real set of modules enabled on this
// instance, each with the same 3-checkbox shape the legacy matrix uses.
export function GroupEditReplica() {
  const { id } = useParams<{ id: string }>()
  const { data: groups } = useUserGroupsList()
  const group = groups?.find((g) => String(g.id) === id)

  return (
    <DisabledFormPage
      icon={UsersRound}
      title={`Edit Role${group ? ` — ${group.name}` : ''}`}
      sourcePath={`user/group/card.php?id=${id}`}
      sections={[
        { fields: [{ label: 'Group Name', required: true }, { label: 'Description', type: 'textarea' }] },
        {
          heading: 'Permissions',
          fields: PERMISSION_MODULES.flatMap((m) => [
            { label: `${m} — Read`, type: 'checkbox' as const },
            { label: `${m} — Write`, type: 'checkbox' as const },
            { label: `${m} — Delete`, type: 'checkbox' as const },
          ]),
        },
      ]}
    />
  )
}
