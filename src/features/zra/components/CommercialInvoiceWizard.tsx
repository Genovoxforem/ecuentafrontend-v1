import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, FileText, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStepper } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProductOptions } from '../../products/products.queries'
import { useProjectsList } from '../../projects/projects.queries'
import { useGeneralSettings } from '../../settings/settings.queries'
import { useInvoiceIncoterms, useInvoiceDocumentModels } from '../../invoices/invoiceCreate.queries'
import { useBankAccountOptions, useCustomerInvoiceDefaults, usePaymentModes, usePaymentTerms } from '../../invoices/invoiceFormOptions.queries'
import { addInvoiceLine, deleteInvoiceLine, updateInvoiceLine } from '../../../api/invoices'
import { fapi } from '../../../api/axios'
import { formatMoney } from '../../../utils/format'
import { SHIPPING_TAX_CATEGORIES } from '../commercialInvoiceCodes.data'
import { fetchCustomerAdvance, fetchWizardDraft, fetchWizardRate, INVOICE_TYPES, saveWizardDraft, useWizardBootstrap, validateWizardInvoice, WizardError, type ValidatedInvoice } from '../commercialInvoice.data'

// "New invoice - Wizard" (compta/facture/card-wizard.php): 4 steps — Invoice Basics, Products & Services,
// Shipment & Payment, Review & Confirm. The same fields and rules as the backend page:
//  - Type: Standard, Lpo, Export, Commercial Invoice (9), Provisional (10), Final Invoice (11), Final Credit Note (12),
//    Final Combined (13). The ZRA commercial-invoice field groups show per type exactly like the page
//    (9: customs/sender/delivery/logistics; 9-13: bank; 10-13: chain references + deductions).
//  - "Next" / "Save Draft" save the header through wizard_api.php save_draft; the lines go through
//    compta/facture/fapi/lines.php; Confirm calls validate_invoice with the chosen way to create the invoice.
// Not verified live: no invoice was created while building this (newecuenta is live and validating can submit to ZRA).

type Fields = Record<string, string>
const STEPS = [
  { title: 'Invoice Basics', subtitle: '' },
  { title: 'Products & Services', subtitle: '' },
  { title: 'Shipment & Payment', subtitle: '' },
  { title: 'Review & Confirm', subtitle: '' },
]

interface WLine {
  key: number
  id?: number
  productId: string
  label: string
  qty: number
  unitPriceHt: number
  discount: number
  productType: number
  dirty: boolean
  // The backend's own figures for a saved line: it decides the VAT (from the product and the customer), not the form.
  saved?: { ht: number; vat: number; ttc: number }
}
let lineSeq = 0
const newLine = (): WLine => ({ key: lineSeq++, productId: '', label: '', qty: 1, unitPriceHt: 0, discount: 0, productType: 0, dirty: true })

// yyyy-MM-dd -> MM/dd/yyyy, the format the backend's date fields use.
const isoToUs = (iso: string) => {
  const [y = '', m = '', d = ''] = iso.split('-')
  return iso ? `${m}/${d}/${y}` : ''
}
const dateParts = (prefix: string, iso: string): Fields => {
  const [y = '', m = '', d = ''] = iso.split('-')
  return { [prefix]: isoToUs(iso), [`${prefix}day`]: d, [`${prefix}month`]: m, [`${prefix}year`]: y }
}
const shipDateParts = (iso: string): Fields => {
  const [y = '', m = '', d = ''] = iso.split('-')
  return { shipmentdt: isoToUs(iso), shipmentdtday: d, shipmentdtmonth: m, shipmentdtyear: y }
}

interface CiField {
  name: string
  label: string
  placeholder?: string
  select?: 'ports' | 'dprtr' | 'dstntn' | 'banks'
  wide?: boolean
}

const CI_CUSTOMS: CiField[] = [
  { name: 'ci_customsCd', label: 'Customs Office Code', placeholder: 'e.g. LIA' },
  { name: 'ci_ucrNo', label: 'UCR No' },
  { name: 'ci_shipmentNo', label: 'Shipment No' },
  { name: 'ci_consignmentNo', label: 'Consignment No' },
  { name: 'ci_shippingDt', label: 'Shipping Date/Time', placeholder: 'YYYY-MM-DD HH:MM' },
  { name: 'ci_loadingPortCd', label: 'Loading Port (6.19)', select: 'ports' },
  { name: 'ci_loadingPort', label: 'Loading Port (other)' },
  { name: 'ci_dischargePort', label: 'Discharge Port' },
  { name: 'ci_dprtrIncotermCd', label: 'Departure Incoterm (6.21)', select: 'dprtr' },
  { name: 'ci_dprtrIncotermOther', label: 'Departure Incoterm (Other)' },
  { name: 'ci_dstntnIncotermCd', label: 'Destination Incoterm (6.20)', select: 'dstntn' },
  { name: 'ci_dstntnIncotermOther', label: 'Destination Incoterm (Other)' },
  { name: 'ci_exportRsnTxt', label: 'Export Reason' },
  { name: 'ci_buyerRefNo', label: 'Buyer Ref No' },
  { name: 'ci_orgnNatCd', label: 'Origin Country', placeholder: 'ZM' },
  { name: 'ci_exportCountryCd', label: 'Export Country', placeholder: 'ZM' },
]
const CI_SENDER_RECEIVER: CiField[] = [
  { name: 'ci_senderNm', label: 'Sender Name' },
  { name: 'ci_senderAddrssDesc', label: 'Sender Address' },
  { name: 'ci_senderPostalCd', label: 'Sender Postal/Area' },
  { name: 'ci_senderTelNo', label: 'Sender Phone' },
  { name: 'ci_senderEmail', label: 'Sender Email' },
  { name: 'ci_rcvCompanyNm', label: 'Receiver Company' },
  { name: 'ci_rcvAddrssDesc', label: 'Receiver Address' },
  { name: 'ci_rcvPostalCd', label: 'Receiver Postal/Area' },
  { name: 'ci_rcvNm', label: 'Receiver Contact Name' },
  { name: 'ci_rcvTelNo', label: 'Receiver Phone' },
  { name: 'ci_rcvEmail', label: 'Receiver Email' },
]
const CI_DELIVERY: CiField[] = [
  { name: 'ci_dlvryCompanyNm', label: 'Delivery Company' },
  { name: 'ci_dlvryAddrssDesc', label: 'Delivery Address' },
  { name: 'ci_dlvryPostalCd', label: 'Delivery Postal' },
  { name: 'ci_dlvryLoc', label: 'Delivery Location' },
  { name: 'ci_dlvryContact', label: 'Delivery Contact' },
  { name: 'ci_dlvryTelNo', label: 'Delivery Phone' },
  { name: 'ci_dlvryEmail', label: 'Delivery Email' },
  { name: 'ci_transporterNm', label: 'Transporter Name' },
  { name: 'ci_transporterTpin', label: 'Transporter TPIN' },
  { name: 'ci_transporterAddrssDesc', label: 'Transporter Address' },
  { name: 'ci_transporterInvcNo', label: 'Transporter Invoice No' },
  { name: 'ci_trnsptVhclRegNo', label: 'Vehicle Reg. No' },
  { name: 'ci_vesselNo', label: 'Vessel / Flight No' },
  { name: 'ci_frghtForwarder', label: 'Freight Forwarder' },
]
const CI_LOGISTICS: CiField[] = [
  { name: 'ci_totFreightCosts', label: 'Freight Costs', placeholder: '0.00' },
  { name: 'ci_totHandlingCosts', label: 'Handling Costs', placeholder: '0.00' },
  { name: 'ci_totStorageCosts', label: 'Storage Costs', placeholder: '0.00' },
  { name: 'ci_totInsuranceCosts', label: 'Insurance Costs', placeholder: '0.00' },
  { name: 'ci_totOtherCosts', label: 'Other Costs', placeholder: '0.00' },
]
const CI_BANK: CiField[] = [
  { name: 'ci_bankCd', label: 'Bank (6.23)', select: 'banks' },
  { name: 'ci_swiftCd', label: 'SWIFT Code' },
  { name: 'ci_bnkBranch', label: 'Bank Branch' },
  { name: 'ci_bankAccntNo', label: 'Bank Account No' },
  { name: 'ci_bankAccntHldr', label: 'Account Holder' },
  { name: 'ci_pymntTerms', label: 'Payment Terms' },
  { name: 'ci_destnCountryCd', label: 'Destination Country', placeholder: 'e.g. CD' },
  { name: 'ci_originCountryCd', label: 'Origin Country', placeholder: 'ZM' },
  { name: 'ci_permanentRsdncAdrs', label: 'Permanent Residence Address' },
  { name: 'ci_permanentRsdncCountryCd', label: 'Residence Country', placeholder: 'ZM' },
  { name: 'ci_rfdRsnCd', label: 'Refund Reason Code', placeholder: 'credit note / reversal only' },
]
const CI_DEDUCTIONS: CiField[] = [
  { name: 'ci_treatmentCharges', label: 'Treatment Charges', placeholder: '0.00' },
  { name: 'ci_processingCharges', label: 'Processing Charges', placeholder: '0.00' },
  { name: 'ci_tollingCharges', label: 'Tolling Charges', placeholder: '0.00' },
  { name: 'ci_refineryCharges', label: 'Refinery Charges', placeholder: '0.00' },
  { name: 'ci_freightOrTransport', label: 'Freight / Transport', placeholder: '0.00' },
  { name: 'ci_moistureDeductions', label: 'Moisture Deductions', placeholder: '0.00' },
  { name: 'ci_insolubleDeductions', label: 'Insoluble Deductions', placeholder: '0.00' },
  { name: 'ci_totalDeductions', label: 'Total Deductions', placeholder: '0.00' },
]
const CHAIN_FIELDS = ['ci_commInvcNoList', 'ci_provInvcNoList', 'ci_prchseOrdrNo', 'ci_invcAdjustReason']

const nameOf = (v: Record<string, string> | undefined) => Object.entries(v ?? {}).map(([value, label]) => ({ value, label: `${value} — ${label}` }))

// Which ci_* names the page submits for a type: the groups it hides are disabled and never sent.
function ciNamesFor(type: number): string[] {
  const names: string[] = []
  if (type === 9) names.push(...[CI_CUSTOMS, CI_SENDER_RECEIVER, CI_DELIVERY, CI_LOGISTICS].flat().map((f) => f.name))
  if (type >= 9 && type <= 13) names.push(...CI_BANK.map((f) => f.name))
  if (type >= 10 && type <= 13) names.push(...CHAIN_FIELDS.filter((n) => n !== 'ci_provInvcNoList' || type >= 11), ...CI_DEDUCTIONS.map((f) => f.name))
  return names
}

// The draft's lines as the backend holds them (compta/facture/fapi/get.php), with its own VAT and totals per line.
async function loadServerLines(invoiceId: number): Promise<WLine[]> {
  const res = await fapi.get<{ data?: { lines?: { id: number; product_id?: number; description?: string; label?: string; qty: number; pu_ht: number; remise_percent?: number; product_type?: number; total_ht: number; total_tva: number; total_ttc: number }[] } }>('/compta/facture/fapi/get.php', { params: { id: invoiceId } })
  return (res.data?.data?.lines ?? []).map<WLine>((l) => ({
    key: lineSeq++,
    id: l.id,
    productId: l.product_id ? String(l.product_id) : '',
    label: l.label || l.description || '',
    qty: l.qty,
    unitPriceHt: l.pu_ht,
    discount: l.remise_percent ?? 0,
    productType: l.product_type ?? 0,
    dirty: false,
    saved: { ht: l.total_ht, vat: l.total_tva, ttc: l.total_ttc },
  }))
}

const errText = (e: Record<string, string[]>, name: string) => (e[name] ?? []).join(' ')

export function CommercialInvoiceWizard() {
  const [params] = useSearchParams()
  const today = new Date().toISOString().slice(0, 10)
  const initialType = Number(params.get('type')) || 9
  const reopenId = Number(params.get('id')) || 0

  const [step, setStep] = useState(0)
  const [type, setType] = useState(initialType)
  const [socid, setSocid] = useState('')
  const [v, setV] = useState<Fields>({ re: today, paydt: today, shipmentdt: '', global_discount_type: 'percent', iwzPayMode: 'pay', shippingtva_tx: '' })
  const [lines, setLines] = useState<WLine[]>([newLine()])
  const [removed, setRemoved] = useState<number[]>([])
  const [reward, setReward] = useState(false)
  const [draft, setDraftState] = useState<{ id: number; version: number; ref: string }>({ id: 0, version: 0, ref: '' })
  // The latest id/version, readable inside one async chain (a save, the lines, then the validation) before React re-renders.
  const draftRef = useRef(draft)
  const setDraft = (d: { id: number; version: number; ref: string }) => {
    draftRef.current = d
    setDraftState(d)
  }
  const [advance, setAdvance] = useState<{ amount: number; id: number }>({ amount: 0, id: 0 })
  const [useAdvance, setUseAdvance] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [globalError, setGlobalError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [result, setResult] = useState<ValidatedInvoice | null>(null)
  const [notice, setNotice] = useState('')
  const idempotencyKey = useRef(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `wiz-${Date.now()}-${Math.random().toString(16).slice(2)}`)

  const set = (name: string, value: string) => setV((p) => ({ ...p, [name]: value }))
  const val = (name: string) => v[name] ?? ''

  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: boot } = useWizardBootstrap(socid)
  const { data: products } = useProductOptions()
  const { data: settings } = useGeneralSettings()
  const { data: paymentTerms } = usePaymentTerms()
  const { data: paymentModes } = usePaymentModes()
  const { data: bankAccounts } = useBankAccountOptions()
  const { data: projects } = useProjectsList('all')
  const { data: incotermData } = useInvoiceIncoterms()
  const { data: modelData } = useInvoiceDocumentModels()
  const { data: defaults } = useCustomerInvoiceDefaults(socid)
  const baseCurrency = boot?.company_currency ?? settings?.currency ?? ''
  const currency = val('multicurrency_code') || baseCurrency
  const foreign = !!currency && !!baseCurrency && currency !== baseCurrency

  const ci = boot?.ci
  const offered = boot?.invoice_types ?? [0]
  const customerName = customers?.find((c) => c.id === socid)?.name ?? ''
  const projectOptions = (projects?.items ?? []).filter((p) => !p.thirdPartyName || !customerName || p.thirdPartyName === customerName)

  // Like the page: payment terms default to "Due Upon Receipt"; picking a customer fills in their bank account and currency.
  useEffect(() => {
    if (!val('cond_reglement_id') && paymentTerms?.length) set('cond_reglement_id', (paymentTerms.find((t) => /due upon receipt/i.test(t.text)) ?? paymentTerms[0]).id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentTerms])
  useEffect(() => {
    if (!val('model') && modelData?.defaultModel) set('model', modelData.defaultModel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelData])
  useEffect(() => {
    // A re-opened draft keeps what it saved: the customer's defaults only fill a new invoice.
    if (!defaults || reopenId) return
    setV((p) => ({
      ...p,
      ...(defaults.fkAccount && defaults.fkAccount !== '0' ? { fk_account: defaults.fkAccount } : {}),
      multicurrency_code: defaults.multicurrencyCode ?? baseCurrency,
      multicurrency_tx: defaults.multicurrencyCode && defaults.multicurrencyCode !== baseCurrency ? String(defaults.multicurrencyTx) : '1',
    }))
  }, [defaults, baseCurrency, reopenId])
  useEffect(() => {
    if (!reopenId) set('projectid', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socid])
  // The customer's unused advance (core/ajax/thirdparty.php), offered on the "validate & pay" option like the page.
  useEffect(() => {
    setUseAdvance(false)
    if (!socid) {
      setAdvance({ amount: 0, id: 0 })
      return
    }
    let live = true
    fetchCustomerAdvance(socid).then((a) => live && setAdvance(a)).catch(() => live && setAdvance({ amount: 0, id: 0 }))
    return () => {
      live = false
    }
  }, [socid])
  // card-wizard.php?id=N re-opens a saved draft: header, shipment and ZRA fields from get_draft, the lines from the invoice.
  useEffect(() => {
    if (!reopenId) return
    let live = true
    setLoadingDraft(true)
    ;(async () => {
      try {
        const d = await fetchWizardDraft(reopenId)
        if (!live) return
        if (d.is_draft === 0) throw new Error('This invoice is no longer a draft.')
        const text = (x: unknown) => (x === null || x === undefined || x === 'NULL' ? '' : String(x))
        const grn = d.grndetails && !Array.isArray(d.grndetails) ? d.grndetails : {}
        const next: Fields = {
          ref_client: text(d.ref_client),
          re: d.invoice_date ?? today,
          cond_reglement_id: text(d.cond_reglement_id),
          mode_reglement_id: text(d.mode_reglement_id),
          fk_account: d.fk_account && String(d.fk_account) !== '0' ? String(d.fk_account) : '',
          projectid: d.projectid && String(d.projectid) !== '0' ? String(d.projectid) : '',
          model: text(d.model_pdf),
          incoterm_id: d.fk_incoterms ? String(d.fk_incoterms) : '',
          location_incoterms: text(d.location_incoterms),
          note_public: text(d.note_public),
          note_private: text(d.note_private),
          multicurrency_code: text(d.multicurrency_code),
          multicurrency_tx: text(d.multicurrency_tx),
          refno: text(d.refno),
          lpono: text(d.lpono),
          shipmentvia: text(d.shipmentvia),
          shipmentdt: (d.shipmentdate ?? '').slice(0, 10),
          shipmentaddress: text(d.shipmentaddress),
          trackingid: text(d.trackingid),
          gdnno: text(grn.gdnno),
          grnno: text(grn.grnno),
          shipment_month: text(grn.shipment_month),
          transporter: text(grn.transporter),
          truck_details: text(grn.truck_details),
          zra_reward_mobile: text(d.zra_reward_mobile),
          zra_reward_email: text(d.zra_reward_email),
        }
        for (const [k, raw] of Object.entries(d.ci_fields ?? {})) {
          if (k === 'items') continue
          next[`ci_${k}`] = Array.isArray(raw) ? raw.join(', ') : text(raw)
        }
        setV((p) => {
          const merged = { ...p }
          for (const [k, x] of Object.entries(next)) if (x !== '') merged[k] = x
          return merged
        })
        setType(d.type)
        setReward(!!d.zra_reward_participate)
        setSocid(String(d.socid))
        setDraft({ id: d.invoice_id, version: d.version, ref: d.ref ?? '' })
        const saved = await loadServerLines(reopenId)
        if (!live) return
        if (saved.length) setLines(saved)
        setNotice(`Draft ${d.ref ?? `#${d.invoice_id}`} re-opened.`)
      } catch (e) {
        if (live) setGlobalError(e instanceof Error ? e.message : 'Could not load the draft.')
      } finally {
        if (live) setLoadingDraft(false)
      }
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reopenId])
  // A foreign currency's rate comes from the exchange-rate table, like the page.
  useEffect(() => {
    if (!foreign) return
    let live = true
    fetchWizardRate(currency, val('re')).then((r) => live && r > 0 && set('multicurrency_tx', String(r))).catch(() => undefined)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, foreign])

  const totals = useMemo(() => {
    let ht = 0
    let tva = 0
    let pending = false
    for (const l of lines) {
      if (l.saved && !l.dirty) {
        ht += l.saved.ht
        tva += l.saved.vat
      } else {
        // Not saved yet: the backend sets the VAT on save, so only the net amount is known here.
        ht += l.qty * l.unitPriceHt * (1 - l.discount / 100)
        if (l.label.trim()) pending = true
      }
    }
    return { ht, tva, ttc: ht + tva, pending }
  }, [lines])

  const typeLabel = INVOICE_TYPES.find((t) => t.value === type)?.label ?? String(type)
  const isChain = type >= 10 && type <= 13
  const payMode = val('iwzPayMode') || 'pay'

  const ciInput = (f: CiField) => {
    const name = f.name
    let control
    if (f.select) {
      const opts = f.select === 'ports' ? nameOf(ci?.zambia_ports) : f.select === 'dprtr' ? nameOf(ci?.departure_incoterms) : f.select === 'dstntn' ? nameOf(ci?.destination_incoterms) : nameOf(ci?.banks)
      control = (
        <select value={val(name)} onChange={(e) => set(name, e.target.value)} className={inputClasses}>
          <option value="" />
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    } else {
      control = <input type="text" value={val(name)} placeholder={f.placeholder} onChange={(e) => set(name, e.target.value)} className={inputClasses} />
    }
    return (
      <div key={name}>
        <Field label={f.label}>{control}</Field>
        {errText(errors, name) && <p className="mt-1 text-xs text-danger">{errText(errors, name)}</p>}
      </div>
    )
  }
  const group = (title: string, fields: CiField[]) => (
    <Card key={title} className="!h-auto shrink-0">
      <h3 className="mb-3 text-sm font-semibold text-text!">{title}</h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{fields.map(ciInput)}</div>
    </Card>
  )

  const issuedPicker = (name: 'ci_commInvcNoList' | 'ci_provInvcNoList', label: string, issued: { invc_no: string; ref: string }[]) => {
    const chosen = val(name)
      .split(/[\s,;]+/)
      .filter(Boolean)
    return (
      <div>
        <Field label={label}>
          <input type="text" value={val(name)} placeholder="e.g. 12, 18" onChange={(e) => set(name, e.target.value)} className={inputClasses} />
        </Field>
        {issued.length > 0 && (
          <select
            multiple
            aria-label={name === 'ci_commInvcNoList' ? 'Issued Commercial Invoices' : 'Issued Provisional Invoices'}
            value={chosen}
            onChange={(e) => set(name, Array.from(e.target.selectedOptions, (o) => o.value).join(', '))}
            className={`${inputClasses} mt-1`}
          >
            {issued.map((r) => (
              <option key={r.invc_no} value={r.invc_no}>
                {r.ref} — ZRA {r.invc_no}
              </option>
            ))}
          </select>
        )}
        {errText(errors, name) && <p className="mt-1 text-xs text-danger">{errText(errors, name)}</p>}
      </div>
    )
  }

  // The page's header rules (clientValidate) and the step-3 chain rules (validateStepFields).
  function validateHeader(): Record<string, string[]> {
    const e: Record<string, string[]> = {}
    if (!socid) e.socid = ['Customer is required']
    if (!val('re')) e.invoice_date = ['Invoice date is required']
    if (!val('mode_reglement_id')) e.mode_reglement_id = ['Payment mode is required']
    if (!val('cond_reglement_id')) e.cond_reglement_id = ['Payment terms are required']
    if (type === 6) {
      if (!val('refno').trim()) e.refno = ['Ref No is required for LPO invoices']
      if (!val('lpono').trim()) e.lpono = ['LPO No is required for LPO invoices']
    }
    if (reward && !val('zra_reward_mobile').trim() && !val('zra_reward_email').trim()) {
      e.zra_reward_mobile = ['Reward participation is on — enter the customer mobile or email']
      e.zra_reward_email = ['Reward participation is on — enter the customer mobile or email']
    }
    return e
  }
  function validateShipmentStep(): Record<string, string[]> {
    const e: Record<string, string[]> = {}
    const comm = val('ci_commInvcNoList').trim()
    const prov = val('ci_provInvcNoList').trim()
    if (isChain && !val('ci_prchseOrdrNo').trim()) e.ci_prchseOrdrNo = ['Purchase Order No is required']
    if (type === 10 && !comm) e.ci_commInvcNoList = ['Select an issued Commercial Invoice']
    if (type === 11 && !comm && !prov) e.ci_commInvcNoList = ['Select a Commercial or Provisional Invoice']
    if ((type === 12 || type === 13) && !prov) e.ci_provInvcNoList = ['Select an issued Provisional Invoice']
    const list = /^[1-9][0-9]*(?:[\s,;]+[1-9][0-9]*)*$/
    for (const [name, text] of [['ci_commInvcNoList', comm], ['ci_provInvcNoList', prov]] as const) {
      if (text && !list.test(text) && !e[name]) e[name] = ['Use positive ZRA invoice numbers separated by commas']
    }
    if (payMode === 'pay') {
      if (!(Number(val('payment_amount')) > 0)) e.payment_amount = ['Enter the received amount']
      if (!val('iwzPayModeSel')) e.iwzPayModeSel = ['Select a payment mode']
      if ((bankAccounts?.length ?? 0) > 0 && !val('iwzPayAccount')) e.iwzPayAccount = ['Select the paid-into account']
      if (!val('paydt')) e.paydt = ['Payment date is required']
    }
    return e
  }

  // Every field the page's form submits for the current type.
  function buildFields(extra: Fields = {}): Fields {
    const f: Fields = {
      invoice_id: String(draftRef.current.id || 0),
      version: String(draftRef.current.version || 0),
      idempotency_key: idempotencyKey.current,
      type: String(type),
      socid,
      invoice_status: '0',
      invoice_type_hidden: String(type),
      socid_hidden: socid,
      zra_reward_shown: '1',
      zra_reward_mobile: val('zra_reward_mobile'),
      zra_reward_email: val('zra_reward_email'),
      ref_client: val('ref_client'),
      ...dateParts('re', val('re')),
      cond_reglement_id: val('cond_reglement_id'),
      mode_reglement_id: val('mode_reglement_id'),
      fk_account: val('fk_account') || '-1',
      projectid: val('projectid') || '0',
      model: val('model'),
      incoterm_id: val('incoterm_id') || '0',
      location_incoterms: val('location_incoterms'),
      multicurrency_code: currency,
      multicurrency_tx: foreign ? val('multicurrency_tx') : '1',
      note_public: val('note_public'),
      note_private: val('note_private'),
      shipmentvia: val('shipmentvia'),
      ...shipDateParts(val('shipmentdt')),
      trackingid: val('trackingid'),
      shipmentaddress: val('shipmentaddress'),
      gdnno: val('gdnno'),
      grnno: val('grnno'),
      shipment_month: val('shipment_month'),
      transporter: val('transporter'),
      truck_details: val('truck_details'),
      shippingtva_tx: val('shippingtva_tx') || '0',
      shipping_value: val('shipping_value'),
      global_discount_value: val('global_discount_value'),
      global_discount_type: val('global_discount_type') || 'percent',
      payment_amount: val('payment_amount'),
      ...dateParts('paydt', val('paydt')),
      advance_amount: String(advance.amount),
      advance_id: String(advance.id),
      ...extra,
    }
    if (reward) f.zra_reward_participate = '1'
    if (type === 6) {
      f.refno = val('refno')
      f.lpono = val('lpono')
    }
    for (const name of ciNamesFor(type)) f[name] = val(name)
    return f
  }

  // Writes the line changes to the draft, then re-reads the draft's lines (the backend decides each line's VAT and totals) and its
  // `version`, which every line change moves: saving the header with the old one is refused as "modified elsewhere".
  async function syncLines(invoiceId: number) {
    const real = lines.filter((l) => l.label.trim() && l.qty > 0)
    // The ZRA module needs an item on every line: a free-text line makes the backend fail (facture.class.php, "iplCatCd_code on null").
    if (real.some((l) => !Number(l.productId))) throw new Error('Choose a product or service for every line — a line without one cannot be saved on this backend.')
    let changed = removed.length > 0
    for (const id of removed) await deleteInvoiceLine(invoiceId, id)
    setRemoved([])
    for (const l of lines) {
      if (!l.label.trim() || !(l.qty > 0)) {
        if (l.id) {
          await deleteInvoiceLine(invoiceId, l.id)
          changed = true
        }
        continue
      }
      const body = {
        description: l.label,
        label: l.label,
        qty: l.qty,
        pu_ht: l.unitPriceHt,
        remise_percent: l.discount,
        product_type: l.productType,
        product_id: Number(l.productId),
      }
      if (!l.id) {
        await addInvoiceLine(invoiceId, body)
        changed = true
      } else if (l.dirty) {
        await updateInvoiceLine(invoiceId, l.id, body)
        changed = true
      }
    }
    if (!changed) return
    const fresh = await loadServerLines(invoiceId)
    setLines(fresh.length ? fresh : [newLine()])
    const d = await fetchWizardDraft(invoiceId)
    setDraft({ id: invoiceId, version: d.version, ref: draftRef.current.ref })
  }

  function showError(e: unknown, fallback: string) {
    if (e instanceof WizardError) {
      setErrors(e.errors)
      setUncertain(e.uncertain)
      setGlobalError(e.message)
    } else {
      setGlobalError(e instanceof Error ? e.message : fallback)
    }
  }

  // Save Draft / Next: the header, shipment and ZRA fields first (validate_invoice does not save them), then the lines.
  async function saveDraft(withLines: boolean): Promise<number | null> {
    setErrors({})
    setGlobalError('')
    setNotice('')
    const header = validateHeader()
    if (Object.keys(header).length) {
      setErrors(header)
      setGlobalError('Please fix the highlighted fields.')
      setStep(0)
      return null
    }
    setBusy(true)
    try {
      const saved = await saveWizardDraft(buildFields())
      setDraft({ id: saved.invoice_id, version: saved.version || 0, ref: saved.reference ?? '' })
      if (withLines) await syncLines(saved.invoice_id)
      setNotice(`Draft saved${saved.reference ? ` ${saved.reference}` : ''}.`)
      return saved.invoice_id
    } catch (e) {
      showError(e, 'Could not save the draft.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (step === 0) {
      const id = await saveDraft(false)
      if (id) setStep(1)
      return
    }
    if (step === 1) {
      if (!draftRef.current.id) return
      setBusy(true)
      setGlobalError('')
      try {
        await syncLines(draftRef.current.id)
        setStep(2)
      } catch (e) {
        showError(e, 'Could not save the invoice lines.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (step === 2) {
      const e = { ...validateHeader(), ...validateShipmentStep() }
      setErrors(e)
      if (Object.keys(e).length) {
        setGlobalError('Please fix the highlighted fields.')
        return
      }
      const id = await saveDraft(true)
      if (id) setStep(3)
    }
  }

  async function confirm() {
    if (payMode !== 'draft' && !lines.some((l) => l.label.trim() && l.qty > 0)) {
      setStep(1)
      setGlobalError('Add at least one product or service before validating the invoice.')
      return
    }
    const e = { ...validateHeader(), ...validateShipmentStep() }
    if (Object.keys(e).length) {
      setStep(2)
      setErrors(e)
      setGlobalError('Complete the required fields before confirming.')
      return
    }
    const id = await saveDraft(true)
    if (!id) return
    setBusy(true)
    try {
      const applyAdvance = payMode === 'pay' && useAdvance && advance.amount > 0
      const done = await validateWizardInvoice(
        buildFields({
          invoice_id: String(id),
          pay_mode: payMode,
          payment_mode_id: val('iwzPayModeSel'),
          payment_account_id: val('iwzPayAccount'),
          use_advance: applyAdvance ? '1' : '0',
          advance_id: applyAdvance ? String(advance.id) : '0',
        }),
      )
      setResult(done)
    } catch (err) {
      showError(err, 'Validation failed.')
    } finally {
      setBusy(false)
    }
  }

  const setLine = (key: number, patch: Partial<WLine>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch, dirty: true } : l)))
  const pickProduct = (key: number, productId: string) => {
    const p = products?.find((x) => x.id === productId)
    setLine(key, { productId, label: p?.label ?? '', unitPriceHt: p ? p.priceExclTax : 0, productType: p?.type === 'service' ? 1 : 0 })
  }
  const removeLine = (l: WLine) => {
    if (l.id) setRemoved((p) => [...p, l.id as number])
    setLines((p) => p.filter((x) => x.key !== l.key))
  }

  const radio = (value: string, title: string, rest: string) => (
    <label key={value} className="flex items-start gap-2 text-sm text-text">
      <input type="radio" name="iwzPayMode" checked={payMode === value} onChange={() => set('iwzPayMode', value)} className="mt-1" />
      <span>
        <strong>{title}</strong> — {rest}
      </span>
    </label>
  )

  if (result) {
    return (
      <div className="space-y-4">
        <Card className="!h-auto">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Check size={20} className="text-success" /> Invoice Created
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {(
              [
                ['Invoice Ref', result.ref],
                ['Status', result.status_label ?? result.status],
                ['Customer', result.customer_name],
                [`Total (excl. tax)`, result.total_ht != null ? `${formatMoney(result.total_ht)} ${baseCurrency}` : ''],
                ['VAT', result.total_tva != null ? `${formatMoney(result.total_tva)} ${baseCurrency}` : ''],
                [`Total (incl. tax)`, result.total_ttc != null ? `${formatMoney(result.total_ttc)} ${baseCurrency}` : ''],
                ['Paid', result.paid_amount != null ? `${formatMoney(result.paid_amount)} ${baseCurrency}` : ''],
                ['Remaining', result.remain != null ? `${formatMoney(result.remain)} ${baseCurrency}` : ''],
              ] as const
            )
              .filter(([, x]) => x)
              .map(([k, x]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border py-1">
                  <dt className="text-text-muted">{k}</dt>
                  <dd className="font-medium text-text!">{x}</dd>
                </div>
              ))}
          </dl>
          {result.zra && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-text!">ZRA / SDC Information</h3>
              <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {(
                  [
                    ['SDC ID', result.zra.sdc_id],
                    ['Receipt No', result.zra.rcpt_no],
                    ['ZRA Invoice No', result.zra.invc_no],
                    ['MRC', result.zra.mrc_no],
                    ['Receipt Date', result.zra.rcpt_date],
                    ['Status', result.zra.status],
                  ] as const
                )
                  .filter(([, x]) => x)
                  .map(([k, x]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-border py-1">
                      <dt className="text-text-muted">{k}</dt>
                      <dd className="text-text!">{x}</dd>
                    </div>
                  ))}
              </dl>
              {result.zra.error && <p className="mt-2 text-sm text-danger">{result.zra.error}</p>}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {result.invoice_id > 0 && (
              <Link to={ROUTES.invoiceDetail.replace(':id', String(result.invoice_id))} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                Open Invoice
              </Link>
            )}
            {result.pdf_url && (
              <a href={result.pdf_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
                Download PDF
              </a>
            )}
            <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const canCreate = boot?.permissions?.create !== 0
  const btn = 'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60'

  return (
    <StickyFormShell
      header={
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <FileText size={20} className="text-brand" /> New invoice - Wizard
            {draft.id > 0 && <span className="ml-2 rounded bg-surface-hover px-2 py-0.5 text-xs font-normal text-text-muted">Draft {draft.ref || `#${draft.id}`}</span>}
          </h2>
          <WizardStepper steps={STEPS} step={step} onStep={(i) => i <= step && setStep(i)} />
        </>
      }
      footerLeft={
        <Link to={ROUTES.zra} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <>
          {step > 0 && (
            <button type="button" disabled={busy} onClick={() => setStep(step - 1)} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="button" disabled={busy || !canCreate} onClick={() => saveDraft(step >= 1)} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
              <Save size={14} /> Save Draft
            </button>
          )}
          {step < 3 ? (
            <button type="button" disabled={busy || !canCreate} onClick={next} className={`${btn} bg-brand text-white hover:bg-brand-hover`}>
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : null} Next <ArrowRight size={14} />
            </button>
          ) : (
            <button type="button" disabled={busy || uncertain || !canCreate} onClick={confirm} className={`${btn} bg-brand text-white hover:bg-brand-hover`}>
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Confirm
            </button>
          )}
        </>
      }
    >
      {loadingDraft && <p className="text-sm text-text-muted">Loading the draft…</p>}
      {(globalError || notice) && (
        <p className={`text-sm ${globalError ? 'text-danger' : 'text-success-fg'}`}>
          {globalError || notice}
          {draft.id > 0 && globalError && (
            <>
              {' '}
              <Link to={ROUTES.invoiceDetail.replace(':id', String(draft.id))} className="font-medium underline">
                Open draft {draft.ref || `#${draft.id}`}
              </Link>
            </>
          )}
        </p>
      )}

      {/* ── Step 1: Invoice Basics ─────────────────────────────── */}
      {step === 0 && (
        <>
          <Card className="!h-auto shrink-0">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <Field label="Customer" required>
                  <SearchableSelect value={socid} onChange={setSocid} options={(customers ?? []).map((c) => ({ value: c.id, label: c.name, keywords: `${c.tpin} ${c.ref}` }))} placeholder={customersLoading ? 'Loading…' : 'Search customer by name, TPIN or phone'} />
                </Field>
                {errText(errors, 'socid') && <p className="mt-1 text-xs text-danger">{errText(errors, 'socid')}</p>}
              </div>
              <div className="sm:col-span-2 xl:col-span-2">
                {socid && defaults && (
                  <p className="text-xs text-text-muted">
                    Outstanding {formatMoney(defaults.outstandingBalance)} {baseCurrency}
                    {defaults.advanceAmount > 0 ? ` · Advance ${formatMoney(defaults.advanceAmount)}` : ''}
                  </p>
                )}
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={reward} onChange={(e) => setReward(e.target.checked)} /> ZraRewardParticipate
            </label>
            {reward && (
              <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <Field label="ZraRewardMobile">
                    <input type="text" maxLength={32} value={val('zra_reward_mobile')} placeholder="+26097XXXXXXXX" onChange={(e) => set('zra_reward_mobile', e.target.value)} className={inputClasses} />
                  </Field>
                  {errText(errors, 'zra_reward_mobile') && <p className="mt-1 text-xs text-danger">{errText(errors, 'zra_reward_mobile')}</p>}
                </div>
                <div>
                  <Field label="ZraRewardEmail">
                    <input type="email" maxLength={100} value={val('zra_reward_email')} placeholder="customer@example.com" onChange={(e) => set('zra_reward_email', e.target.value)} className={inputClasses} />
                  </Field>
                  {errText(errors, 'zra_reward_email') && <p className="mt-1 text-xs text-danger">{errText(errors, 'zra_reward_email')}</p>}
                </div>
              </div>
            )}
          </Card>

          <Card className="!h-auto shrink-0">
            <p className="mb-2 text-sm text-text">
              Type<span className="text-danger">*</span>
            </p>
            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Invoice type">
              {INVOICE_TYPES.filter((t) => offered.includes(t.value)).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={type === t.value}
                  disabled={!!draft.id}
                  title={draft.id ? 'The type cannot change once the draft is saved.' : undefined}
                  onClick={() => setType(t.value)}
                  className={`rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${type === t.value ? 'border-brand bg-brand/5 text-brand' : 'border-border text-text-muted hover:bg-surface-hover'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {type === 6 && (
                <>
                  <div>
                    <Field label="Ref No" required>
                      <input type="text" maxLength={15} value={val('refno')} placeholder="Enter Ref No" onChange={(e) => set('refno', e.target.value)} className={inputClasses} />
                    </Field>
                    {errText(errors, 'refno') && <p className="mt-1 text-xs text-danger">{errText(errors, 'refno')}</p>}
                  </div>
                  <div>
                    <Field label="LPO No" required>
                      <input type="text" maxLength={15} value={val('lpono')} placeholder="Enter LPO No" onChange={(e) => set('lpono', e.target.value)} className={inputClasses} />
                    </Field>
                    {errText(errors, 'lpono') && <p className="mt-1 text-xs text-danger">{errText(errors, 'lpono')}</p>}
                  </div>
                  <div className="hidden xl:block" />
                </>
              )}
              <Field label="Ref. customer">
                <input type="text" value={val('ref_client')} onChange={(e) => set('ref_client', e.target.value)} className={inputClasses} />
              </Field>
              <div>
                <Field label="Invoice date" required>
                  <input type="date" value={val('re')} onChange={(e) => set('re', e.target.value)} className={inputClasses} />
                </Field>
                {errText(errors, 'invoice_date') && <p className="mt-1 text-xs text-danger">{errText(errors, 'invoice_date')}</p>}
              </div>
              <div>
                <Field label="Payment Terms" required>
                  <select value={val('cond_reglement_id')} onChange={(e) => set('cond_reglement_id', e.target.value)} className={inputClasses}>
                    {(paymentTerms ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.text}
                      </option>
                    ))}
                  </select>
                </Field>
                {errText(errors, 'cond_reglement_id') && <p className="mt-1 text-xs text-danger">{errText(errors, 'cond_reglement_id')}</p>}
              </div>
              <div>
                <Field label="Payment Type" required>
                  <select value={val('mode_reglement_id')} onChange={(e) => set('mode_reglement_id', e.target.value)} className={inputClasses}>
                    <option value="">Select a payment type</option>
                    {(paymentModes ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.text}
                      </option>
                    ))}
                  </select>
                </Field>
                {errText(errors, 'mode_reglement_id') && <p className="mt-1 text-xs text-danger">{errText(errors, 'mode_reglement_id')}</p>}
              </div>
              <Field label="Bank account">
                <select value={val('fk_account')} onChange={(e) => set('fk_account', e.target.value)} className={inputClasses}>
                  <option value="">Select a bank account</option>
                  {(bankAccounts ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Project">
                <select value={val('projectid')} onChange={(e) => set('projectid', e.target.value)} className={inputClasses}>
                  <option value="">Select a project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.ref})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Doc template">
                <select value={val('model')} onChange={(e) => set('model', e.target.value)} className={inputClasses}>
                  {(modelData?.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              {incotermData?.enabled !== false && (
                <Field label="Incoterms">
                  <div className="flex gap-2">
                    <select value={val('incoterm_id')} onChange={(e) => set('incoterm_id', e.target.value)} className={inputClasses}>
                      <option value="">Select a incoterms</option>
                      {(incotermData?.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {val('incoterm_id') && <input type="text" value={val('location_incoterms')} onChange={(e) => set('location_incoterms', e.target.value)} placeholder="Location" className={`${inputClasses} w-32 shrink-0`} />}
                  </div>
                </Field>
              )}
              <Field label="Currency">
                <div className="flex items-center gap-2">
                  <select value={currency} onChange={(e) => set('multicurrency_code', e.target.value)} className={inputClasses}>
                    {(boot?.currencies ?? []).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {foreign && (
                    <input type="number" min={0} step="0.0001" value={val('multicurrency_tx')} onChange={(e) => set('multicurrency_tx', e.target.value)} title={`1 ${baseCurrency} = ? ${currency}`} className={`${inputClasses} w-28 shrink-0`} />
                  )}
                </div>
              </Field>
              <div className="sm:col-span-2 xl:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Note (public)">
                  <textarea rows={3} value={val('note_public')} onChange={(e) => set('note_public', e.target.value)} className={inputClasses} />
                </Field>
                <Field label="Note (private)">
                  <textarea rows={3} value={val('note_private')} onChange={(e) => set('note_private', e.target.value)} className={inputClasses} />
                </Field>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── Step 2: Products & Services ────────────────────────── */}
      {step === 1 && (
        <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold text-text!">Item Table</h3>
            <button type="button" onClick={() => setLines((p) => [...p, newLine()])} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              <Plus size={13} /> Add line
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-4 py-2.5 font-medium">Product/Service</th>
                  <th className="w-20 px-4 py-2.5 font-medium">Qty</th>
                  <th className="w-28 px-4 py-2.5 font-medium">Unit Price (Excl.)</th>
                  <th className="w-20 px-4 py-2.5 font-medium">Disc. %</th>
                  <th className="w-24 px-4 py-2.5 text-right font-medium">VAT</th>
                  <th className="w-28 px-4 py-2.5 text-right font-medium">Total TTC</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b border-border align-top">
                    <td className="space-y-1 px-4 py-2">
                      <select value={l.productId} onChange={(e) => pickProduct(l.key, e.target.value)} className={inputClasses}>
                        <option value="">Select a product or service</option>
                        {products?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input type="text" value={l.label} onChange={(e) => setLine(l.key, { label: e.target.value })} placeholder="Description" className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} value={l.qty} onChange={(e) => setLine(l.key, { qty: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} step="0.01" value={l.unitPriceHt} onChange={(e) => setLine(l.key, { unitPriceHt: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} max={100} value={l.discount} onChange={(e) => setLine(l.key, { discount: Number(e.target.value) })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{l.saved && !l.dirty ? formatMoney(l.saved.vat) : '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text!">{l.saved && !l.dirty ? formatMoney(l.saved.ttc) : '—'}</td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" title="Remove line" disabled={lines.length === 1} onClick={() => removeLine(l)} className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-danger disabled:cursor-not-allowed disabled:opacity-30">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border p-4">
            <h3 className="mb-2 font-semibold text-text!">Totals</h3>
            <div className="grid max-w-md grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Total (Excl. Tax):</p>
                <p className="font-semibold tabular-nums text-text!">{formatMoney(totals.ht)}</p>
              </div>
              <div>
                <p className="text-text-muted">Total Tax:</p>
                <p className="font-semibold tabular-nums text-text!">{formatMoney(totals.tva)}</p>
              </div>
              <div>
                <p className="text-text-muted">Total (Inc. Tax):</p>
                <p className="font-semibold tabular-nums text-text!">{formatMoney(totals.ttc)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              The backend sets each line's VAT (from the product and the customer) when the line is saved, so VAT and the gross totals show after saving.
              {totals.pending ? ' Some lines are not saved yet.' : ''}
              {foreign ? ` Prices are in ${baseCurrency}; the invoice is also kept in ${currency} at ${val('multicurrency_tx') || '1'} (${formatMoney(totals.ht * (Number(val('multicurrency_tx')) || 1))} ${currency} excl. tax).` : ''}
            </p>
          </div>
        </Card>
      )}

      {/* ── Step 3: Shipment & Payment ─────────────────────────── */}
      {step === 2 && (
        <>
          <Card className="!h-auto shrink-0">
            <h3 className="mb-3 text-sm font-semibold text-text!">Shipment</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Shipping Via">
                <input type="text" value={val('shipmentvia')} placeholder="Via" onChange={(e) => set('shipmentvia', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Shipping Date">
                <input type="date" value={val('shipmentdt')} onChange={(e) => set('shipmentdt', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Tracking ID">
                <input type="text" value={val('trackingid')} placeholder="Tracking ID" onChange={(e) => set('trackingid', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Shipping Address">
                <textarea rows={2} value={val('shipmentaddress')} placeholder="Address" onChange={(e) => set('shipmentaddress', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="GDN No.">
                <input type="text" value={val('gdnno')} placeholder="GDN Number" onChange={(e) => set('gdnno', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="GRN No.">
                <input type="text" value={val('grnno')} placeholder="GRN Number" onChange={(e) => set('grnno', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Month">
                <input type="text" value={val('shipment_month')} placeholder="e.g. January 2025" onChange={(e) => set('shipment_month', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Transporter">
                <input type="text" value={val('transporter')} placeholder="Transporter name" onChange={(e) => set('transporter', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Truck Details">
                <input type="text" value={val('truck_details')} placeholder="Truck/Vehicle details" onChange={(e) => set('truck_details', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Shipping Charges — VAT">
                <select value={val('shippingtva_tx')} onChange={(e) => set('shippingtva_tx', e.target.value)} className={inputClasses}>
                  <option value="">Select Tax Category</option>
                  {SHIPPING_TAX_CATEGORIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Shipping Charges (Amount (inc. tax))">
                <input type="text" value={val('shipping_value')} placeholder="0.00" onChange={(e) => set('shipping_value', e.target.value)} className={inputClasses} />
              </Field>
            </div>
          </Card>

          {type === 9 && (
            <>
              {group('Commercial Invoice — Customs & Export', CI_CUSTOMS)}
              {group('Sender & Receiver', CI_SENDER_RECEIVER)}
              {group('Delivery & Transporter', CI_DELIVERY)}
              {group('Logistics Costs', CI_LOGISTICS)}
            </>
          )}
          {type >= 9 && type <= 13 && group('Bank, Payment & Location', CI_BANK)}
          {isChain && (
            <>
              <Card className="!h-auto shrink-0">
                <h3 className="mb-3 text-sm font-semibold text-text!">Provisional / Final Invoice — Chain References</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {issuedPicker('ci_commInvcNoList', 'Commercial Invoice No(s) (comma separated ZRA invcNo)', ci?.issued_commercial_invoices ?? [])}
                  {type >= 11 && issuedPicker('ci_provInvcNoList', 'Provisional Invoice No(s) (comma separated)', ci?.issued_provisional_invoices ?? [])}
                  <div>
                    <Field label="Purchase Order No (required)">
                      <input type="text" value={val('ci_prchseOrdrNo')} onChange={(e) => set('ci_prchseOrdrNo', e.target.value)} className={inputClasses} />
                    </Field>
                    {errText(errors, 'ci_prchseOrdrNo') && <p className="mt-1 text-xs text-danger">{errText(errors, 'ci_prchseOrdrNo')}</p>}
                  </div>
                  <Field label="Invoice Adjustment Reason">
                    <input type="text" value={val('ci_invcAdjustReason')} onChange={(e) => set('ci_invcAdjustReason', e.target.value)} className={inputClasses} />
                  </Field>
                </div>
              </Card>
              {group('Deductions', CI_DEDUCTIONS)}
            </>
          )}

          <Card className="!h-auto shrink-0">
            <h3 className="mb-3 text-sm font-semibold text-text!">Discount</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Discount on total">
                <input type="number" min={0} step="0.01" value={val('global_discount_value')} placeholder="0.00" onChange={(e) => set('global_discount_value', e.target.value)} className={inputClasses} />
              </Field>
              <Field label="Apply as">
                <select value={val('global_discount_type')} onChange={(e) => set('global_discount_type', e.target.value)} className={inputClasses}>
                  <option value="percent">Percent (%)</option>
                  <option value="amount">Amount off total ({baseCurrency})</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card className="!h-auto shrink-0">
            <h3 className="mb-3 text-sm font-semibold text-text!">How should this invoice be created?</h3>
            <div className="space-y-2">
              {radio('none', 'Create invoice without payment', 'validate it and pay later')}
              {radio('pay', 'Validate & record a payment now', 'the invoice is validated and the payment below is recorded')}
              {radio('draft', 'Save as draft only', "don't validate yet")}
            </div>
            {payMode === 'pay' && (
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-sm text-text">Invoice Total ({baseCurrency})</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-text!">{formatMoney(totals.ttc)}</p>
                </div>
                <div>
                  <Field label="Received Amount" required>
                    <input type="number" min={0} step="0.01" value={val('payment_amount')} placeholder="0.00" onChange={(e) => set('payment_amount', e.target.value)} className={inputClasses} />
                  </Field>
                  {errText(errors, 'payment_amount') && <p className="mt-1 text-xs text-danger">{errText(errors, 'payment_amount')}</p>}
                </div>
                <div>
                  <p className="text-sm text-text">Balance</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-text!">{formatMoney(Math.max(0, totals.ttc - (Number(val('payment_amount')) || 0)))}</p>
                </div>
                <div>
                  <Field label="Payment Date" required>
                    <input type="date" value={val('paydt')} onChange={(e) => set('paydt', e.target.value)} className={inputClasses} />
                  </Field>
                  {errText(errors, 'paydt') && <p className="mt-1 text-xs text-danger">{errText(errors, 'paydt')}</p>}
                </div>
                <div>
                  <Field label="Payment Mode" required>
                    <select value={val('iwzPayModeSel')} onChange={(e) => set('iwzPayModeSel', e.target.value)} className={inputClasses}>
                      <option value="">Select a payment type</option>
                      {(paymentModes ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.text}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {errText(errors, 'iwzPayModeSel') && <p className="mt-1 text-xs text-danger">{errText(errors, 'iwzPayModeSel')}</p>}
                </div>
                <div>
                  <Field label="Paid Into Account" required>
                    <select value={val('iwzPayAccount')} onChange={(e) => set('iwzPayAccount', e.target.value)} className={inputClasses}>
                      <option value="">Select a bank account</option>
                      {(bankAccounts ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.text}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {errText(errors, 'iwzPayAccount') && <p className="mt-1 text-xs text-danger">{errText(errors, 'iwzPayAccount')}</p>}
                </div>
                {advance.amount > 0 && (
                  <label className="flex items-center gap-2 text-sm text-text sm:col-span-2 xl:col-span-4">
                    <input type="checkbox" checked={useAdvance} onChange={(e) => setUseAdvance(e.target.checked)} />
                    <span>
                      Use customer advance — available: <strong>{formatMoney(advance.amount)} {baseCurrency}</strong>
                    </span>
                  </label>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Step 4: Review & Confirm ───────────────────────────── */}
      {step === 3 && (
        <Card className="!h-auto shrink-0">
          <h3 className="mb-3 text-sm font-semibold text-text!">Review &amp; Confirm</h3>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {(
              [
                ['Customer', customerName],
                ['Invoice Type', typeLabel],
                ['Invoice Date', isoToUs(val('re'))],
                ['Payment Terms', paymentTerms?.find((t) => t.id === val('cond_reglement_id'))?.text ?? ''],
                ['Payment Mode', paymentModes?.find((p) => p.id === val('mode_reglement_id'))?.text ?? ''],
                ['Customer Ref', val('ref_client')],
                ['Items', String(lines.filter((l) => l.label.trim() && l.qty > 0).length)],
                [`Total (excl. tax)`, `${formatMoney(totals.ht)} ${baseCurrency}`],
                [`Total (incl. tax)`, `${formatMoney(totals.ttc)} ${baseCurrency}`],
                ['Action on confirm', payMode === 'pay' ? 'Validate & record a payment now' : payMode === 'draft' ? 'Save as draft only' : 'Create invoice without payment'],
                ...(payMode === 'pay' && useAdvance && advance.amount > 0 ? ([['Customer advance used', `${formatMoney(advance.amount)} ${baseCurrency}`]] as [string, string][]) : []),
                ...(payMode === 'pay' ? ([['Received Amount', `${formatMoney(Number(val('payment_amount')) || 0)} ${baseCurrency}`]] as [string, string][]) : []),
              ] as [string, string][]
            ).map(([k, x]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border py-1.5">
                <dt className="text-text-muted">{k}</dt>
                <dd className="text-right font-medium text-text!">{x}</dd>
              </div>
            ))}
          </dl>
          {payMode !== 'draft' && (
            <p className="mt-3 text-xs text-text-muted">Confirming validates the invoice; on this install a validated invoice is submitted to ZRA.</p>
          )}
          {uncertain && <p className="mt-2 text-sm text-danger">The invoice may still have been processed. Check the invoice list before retrying.</p>}
        </Card>
      )}
      {errors.type && <p className="text-xs text-danger">{errText(errors, 'type')}</p>}
    </StickyFormShell>
  )
}
