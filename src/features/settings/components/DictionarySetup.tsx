import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProductFormOptions } from '../../zra/createProduct.queries'

// The reference app's own real dictionary catalog (its GET /admin/dict.php
// content — dictionary label + real llx_c_* table name, reproduced from the
// screenshot, grouped exactly as shown there). `null` entries are the blank
// separator rows in the reference layout.
interface DictEntry {
  key: string
  label: string
  table: string
}
const DICTIONARIES: (DictEntry | null)[] = [
  { key: 'currencies', label: 'Currencies', table: 'llx_c_currencies' },
  null,
  { key: 'countries', label: 'Countries', table: 'llx_c_country' },
  { key: 'regions', label: 'Regions', table: 'llx_c_regions' },
  { key: 'states', label: 'States/Provinces', table: 'llx_c_departements' },
  null,
  { key: 'legal_entities', label: 'Third-Party Legal Entities', table: 'llx_c_forme_juridique' },
  { key: 'thirdparty_types', label: 'Third-Party Types', table: 'llx_c_typent' },
  { key: 'employees', label: 'Number Of Employees', table: 'llx_c_effectif' },
  { key: 'prospect_level', label: 'Prospect Potential Level For Companies', table: 'llx_c_prospectlevel' },
  { key: 'prospect_status', label: 'Prospect Status For Companies', table: 'llx_c_stcomm' },
  { key: 'social_networks', label: 'Social Networks', table: 'llx_c_socialnetworks' },
  null,
  { key: 'civility', label: 'Honorific Titles', table: 'llx_c_civility' },
  { key: 'contact_types', label: 'Contact/Address Types', table: 'llx_c_type_contact' },
  null,
  { key: 'public_holidays', label: 'HRM - Public Holidays', table: 'llx_c_hrm_public_holiday' },
  { key: 'departments', label: 'HRM - Department List', table: 'llx_c_hrm_department' },
  { key: 'job_positions', label: 'HRM - Job Positions', table: 'llx_c_hrm_function' },
  null,
  { key: 'agenda_events', label: 'Types Of Agenda Events', table: 'llx_c_actioncomm' },
  null,
  { key: 'lead_status', label: 'Lead Status For Project/Lead', table: 'llx_c_lead_status' },
  null,
  { key: 'social_taxes', label: 'Types Of Social Or Fiscal Taxes', table: 'llx_c_chargesociales' },
  { key: 'resource_types', label: 'Type Of Resources', table: 'llx_c_type_resource' },
  { key: 'leave_types', label: 'Types Of Leave', table: 'llx_c_holiday_types' },
  { key: 'expense_fee_types', label: 'Expense Report - Types Of Expense Report Lines', table: 'llx_c_type_fees' },
  { key: 'expense_transport_cat', label: 'Expense Report - Transportation Categories', table: 'llx_c_exp_tax_cat' },
  { key: 'expense_transport_range', label: 'Expense Report - Range By Transportation Category', table: 'llx_c_exp_tax_range' },
  null,
  { key: 'vat_rates', label: 'VAT Rates Or Sales Tax Rates', table: 'llx_c_tva' },
  { key: 'tax_stamps', label: 'Amount Of Tax Stamps', table: 'llx_c_revenuestamp' },
  { key: 'payment_terms', label: 'Payment Terms', table: 'llx_c_payment_term' },
  { key: 'payment_modes', label: 'Payment Modes', table: 'llx_c_paiement' },
  null,
  { key: 'input_reason', label: 'Origin Of Quotations/Orders', table: 'llx_c_input_reason' },
  { key: 'ordering_methods', label: 'Ordering Methods', table: 'llx_c_input_method' },
  { key: 'shipping_methods', label: 'Shipping Methods', table: 'llx_c_shipment_mode' },
  { key: 'delivery_delay', label: 'Delivery Delay', table: 'llx_c_availability' },
  null,
  { key: 'paper_formats', label: 'Paper Formats', table: 'llx_c_paper_format' },
  null,
  { key: 'units', label: 'Measuring Units', table: 'llx_c_units' },
  { key: 'product_nature', label: 'Nature Of Product', table: 'llx_c_product_nature' },
  null,
  { key: 'ticket_type', label: 'DictionaryTicketType', table: 'llx_c_ticket_type' },
  { key: 'ticket_severity', label: 'DictionaryTicketSeverity', table: 'llx_c_ticket_severity' },
  { key: 'ticket_category', label: 'DictionaryTicketCategory', table: 'llx_c_ticket_category' },
]

export function DictionarySetup() {
  const [selected, setSelected] = useState<DictEntry | null>(null)
  const { data: formOptions, isLoading: countriesLoading } = useProductFormOptions()

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-start">
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <BookOpen size={20} className="text-brand" /> Dictionary setup
        </h2>
        <p className="text-sm text-text-muted">
          Insert all reference data. You can add your values to the default. Only elements from <span className="text-brand">enabled modules</span> are shown.
        </p>

        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_220px] px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Dictionaries</span>
            <span>Table</span>
          </div>
          {DICTIONARIES.map((entry, i) =>
            entry === null ? (
              <div key={`gap-${i}`} className="h-3" />
            ) : (
              <button
                key={entry.key}
                type="button"
                onClick={() => setSelected(entry)}
                className={`grid grid-cols-[1fr_220px] px-4 py-2 text-left border-b border-border last:border-0 hover:bg-surface-hover ${
                  selected?.key === entry.key ? 'bg-brand/10' : ''
                }`}
              >
                <span className="text-sm text-brand">{entry.label}</span>
                <span className="text-sm text-text-muted font-mono text-xs">{entry.table}</span>
              </button>
            ),
          )}
        </Card>
      </div>

      <Card className="!h-auto sticky top-4">
        {!selected ? (
          <p className="text-sm text-text-faint italic py-8 text-center">Select a dictionary on the left to view it.</p>
        ) : selected.key === 'countries' ? (
          <>
            <h3 className="text-base font-semibold text-text! mb-1">{selected.label}</h3>
            <p className="text-xs text-text-faint font-mono mb-3">{selected.table}</p>
            <p className="text-xs text-text-faint mb-3">Real data — GET /api/zra/product-form-options/'s countries list (Form::select_country), same source the Product form's Country field uses.</p>
            <div className="max-h-96 overflow-y-auto soft-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2">ID</th>
                    <th className="font-medium py-2">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {countriesLoading ? (
                    <tr>
                      <td colSpan={2} className="py-3 text-text-faint italic">
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    (formOptions?.countries ?? []).map((c) => (
                      <tr key={c.value} className="border-b border-border last:border-0">
                        <td className="py-1.5 text-text-muted">{c.value}</td>
                        <td className="py-1.5 text-text!">{c.label}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-text! mb-1">{selected.label}</h3>
            <p className="text-xs text-text-faint font-mono mb-3">{selected.table}</p>
            <p className="text-sm text-text-faint italic py-6 text-center">Not built yet — no endpoint exists on this backend for this dictionary.</p>
          </>
        )}
      </Card>
    </div>
  )
}
