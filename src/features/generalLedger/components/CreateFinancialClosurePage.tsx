import { FileCheck } from 'lucide-react'
import { DisabledFormPage } from '../../../shared/components/forms/DisabledFormPage'

// accountancy/closure/financialvalidate.php — a tabbed page whose main
// action (validate/update/approve) is a classic form-POST with real
// literal status values ('notapprove'/'started'/'pending'/'completed'/
// 'Approved'), full-page reload, no JSON.
export function CreateFinancialClosurePage() {
  return (
    <DisabledFormPage
      icon={FileCheck}
      title="Create Financial Closure"
      sourcePath="accountancy/closure/financialvalidate.php"
      sections={[
        {
          heading: 'Financial Closing',
          fields: [
            { label: 'Fiscal Year', type: 'select', required: true },
            { label: 'Comments', type: 'textarea' },
            { label: 'Work Status', type: 'select', options: ['Started', 'Pending', 'Completed'] },
            { label: 'Approval', type: 'select', options: ['Not Approved', 'Approved'] },
          ],
        },
      ]}
    />
  )
}
