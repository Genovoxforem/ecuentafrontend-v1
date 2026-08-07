import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Check, X, Info } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, Select, inputClasses } from '../../../shared/components/forms/FormField'

const INVOICE_TYPES = ['Standard invoice', 'Lpo', 'Export', 'Template invoice', 'Credit note']

export function InvoiceCreateForm() {
  const [type, setType] = useState(INVOICE_TYPES[0])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> New invoice
      </h2>

      <Card className="bg-surface-hover! grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Customer" required>
          <select defaultValue="" className={inputClasses}>
            <option value="">Select a third party</option>
          </select>
        </Field>
        <div>
          <p className="text-sm text-danger">Ref.*</p>
          <p className="text-sm text-text-faint mt-1">Draft</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-danger">Type*</span>
          <Info size={13} className="text-text-faint" />
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {INVOICE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-md text-sm border ${type === t ? 'border-brand text-brand bg-brand/5' : 'border-border text-text-muted hover:bg-surface-hover'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Ref. customer">
            <input type="text" className={inputClasses} />
          </Field>
          <Field label="Invoice date" required>
            <input type="date" defaultValue={today} className={inputClasses} />
          </Field>
          <Field label="Payment Terms" required>
            <Select defaultValue="Due Upon Receipt" options={['Due Upon Receipt']} />
          </Field>

          <Field label="Payment Type" required>
            <Select options={[]} />
          </Field>
          <Field label="Bank account">
            <Select options={[]} />
          </Field>
          <Field label="Project">
            <Select options={[]} />
          </Field>

          <Field label="Incoterms">
            <Select options={[]} />
          </Field>
          <Field label="Doc template">
            <Select defaultValue="crabe" options={['crabe']} />
          </Field>
          <Field label="Currency">
            <Select defaultValue="Zambian Kwacha (ZMW)" options={['Zambian Kwacha (ZMW)']} />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-surface border-t border-border py-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static">
        <button type="button" disabled title="Not built yet" className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-80 cursor-default">
          <Check size={14} /> Create draft
        </button>
        <Link to={ROUTES.invoiceList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      </div>
    </div>
  )
}
