import { useState } from 'react'
import {
  FileText,
  Users,
  Truck,
  PackageMinus,
  StickyNote,
  CalendarClock,
  Percent,
  Wallet,
  ExternalLink,
  LoaderCircle,
  Upload,
  Link2,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useOrderNotes,
  useOrderContacts,
  useOrderShipmentStock,
  useAddOrderContact,
  useOrderConsumption,
  useDeclareConsumption,
  useOrderDocuments,
  useOrderAgendaPage,
  useOrderDocumentsPageMeta,
  useUploadOrderDocument,
  useLinkOrderDocument,
} from '../orderDetail.queries'
import type { OrderDetail as OrderDetailData } from '../orderCardParser'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { InfoRow, EditPencil, EventByAvatar, StatCard, deleteOrderDocument, type TabKey } from './OrderDetailShared'

const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

function ContactsTab({ id }: { id: string | undefined }) {
  const [company, setCompany] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, error, refetch } = useOrderContacts(id, company)
  const addContact = useAddOrderContact(id)

  const [userid, setUserid] = useState('')
  const [type, setType] = useState('')
  const [contactid, setContactid] = useState('')
  const [typecontact, setTypecontact] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const { rows, formOptions } = data
  const effectiveCompany = company ?? formOptions.selectedCompanyId

  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users size={14} className="text-brand" />
        <h3 className="font-semibold text-text!">Contacts / Addresses</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Nature of Contact</th>
              <th className="font-medium py-2 px-3">Third-Party</th>
              <th className="font-medium py-2 px-3">Users/Contacts/Addresses</th>
              <th className="font-medium py-2 px-3">Contact Type</th>
              <th className="font-medium py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 px-4 text-text! whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-text-faint" /> Users
                </span>
              </td>
              <td className="py-2 px-3 text-text-muted">{formOptions.issuerCompanyName || '—'}</td>
              <td className="py-2 px-3">
                <select value={userid} onChange={(e) => setUserid(e.target.value)} className={selectCls}>
                  <option value=""></option>
                  {formOptions.internalUserOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-3">
                <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                  {formOptions.internalTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-4 text-right">
                <button
                  type="button"
                  disabled={!userid || !type || type === '0' || addContact.isPending}
                  onClick={() => addContact.mutate({ source: 'internal', userid, type })}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 px-4 text-text! whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-text-faint" /> Third-Party Contacts
                </span>
              </td>
              <td className="py-2 px-3">
                <select
                  value={effectiveCompany}
                  onChange={(e) => {
                    setCompany(e.target.value)
                    setContactid('')
                  }}
                  className={selectCls}
                >
                  {formOptions.companyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-3">
                <select
                  value={contactid}
                  onChange={(e) => setContactid(e.target.value)}
                  disabled={!formOptions.hasRealExternalContact}
                  className={`${selectCls} disabled:opacity-50`}
                >
                  {formOptions.externalContactOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-3">
                <select value={typecontact} onChange={(e) => setTypecontact(e.target.value)} className={selectCls}>
                  {formOptions.externalTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 px-4 text-right">
                <button
                  type="button"
                  disabled={!formOptions.hasRealExternalContact || !contactid || !typecontact || typecontact === '0' || addContact.isPending}
                  onClick={() => addContact.mutate({ source: 'external', contactid, typecontact })}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {addContact.isError && (
        <p className="text-xs text-danger px-4 pb-3">{addContact.error instanceof Error ? addContact.error.message : 'Could not add this contact.'}</p>
      )}

      <div className="border-t border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 px-4">Nature of Contact</th>
              <th className="font-medium py-2 px-3">Third-party</th>
              <th className="font-medium py-2 px-3">Users/Contacts/Addresses</th>
              <th className="font-medium py-2 px-3">Contact type</th>
              <th className="font-medium py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-text-faint italic">
                  No contacts have been assigned to this order yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 px-4 text-text!">{row.nature}</td>
                  <td className="py-2 px-3 text-text-muted">{row.thirdParty}</td>
                  <td className="py-2 px-3 text-text-muted">{row.contact}</td>
                  <td className="py-2 px-3 text-text-muted">{row.contactType}</td>
                  <td className="py-2 px-4 text-text-muted">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ShipmentsTab({ id, data }: { id: string | undefined; data: OrderDetailData }) {
  const { data: shipmentData, isLoading, isError, error, refetch } = useOrderShipmentStock(id)
  const [warehouse, setWarehouse] = useState('')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="!h-auto lg:col-span-2">
          <InfoRow label="Discounts" value={data.discountNote} />
          <InfoRow label="Date" value={data.orderDate} />
          <InfoRow label="Planned delivery" value={data.plannedDelivery} />
          <InfoRow label="Shipping method" value={data.shippingMethod} />
          <InfoRow label="Availability delay" value={data.availabilityDelay} />
          <InfoRow label="Source" value={data.channel} />
          <InfoRow label="Incoterms" value={data.incoterms} />
        </Card>
        <div className="flex flex-col gap-3">
          <StatCard icon={FileText} tone="purple" label="Amount (Excl. Tax)" value={formatMoney(data.totalHt)} />
          <StatCard icon={Percent} tone="green" label="VAT" value={formatMoney(data.totalVat)} />
          <StatCard icon={Wallet} tone="blue" label="Amount (Inc. Tax)" value={formatMoney(data.totalTtc)} />
        </div>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Truck size={14} className="text-brand" />
          <h3 className="font-semibold text-text!">Stock Details</h3>
        </div>
        {isLoading ? (
          <LegacyLoadingCard label="Loading stock details…" />
        ) : isError || !shipmentData ? (
          <LegacyErrorCard title="Couldn't load stock details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : shipmentData.stockRows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No lines to ship.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Description</th>
                  <th className="font-medium py-2 px-3 text-center">Qty ordered</th>
                  <th className="font-medium py-2 px-3 text-center">Qty shipped</th>
                  <th className="font-medium py-2 px-3 text-center">Remain to ship</th>
                  <th className="font-medium py-2 px-4 text-center">Real Stock</th>
                </tr>
              </thead>
              <tbody>
                {shipmentData.stockRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 text-text!">{row.description}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.qtyOrdered}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.qtyShipped}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.remainToShip}</td>
                    <td className="py-2 px-4 text-center text-text-muted">{row.realStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Real form: GET expedition/card.php?action=create&origin=commande&
          origin_id=X&entrepot_id=Y — a safe navigation to the actual
          shipment-creation review page, not itself a destructive submit. */}
      {shipmentData && shipmentData.createForm.warehouseOptions.length > 0 && id && (
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
            <Truck size={14} className="text-brand" /> Create Shipment
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-faint">Source warehouse</span>
              <select
                value={warehouse || shipmentData.createForm.defaultWarehouseId}
                onChange={(e) => setWarehouse(e.target.value)}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 min-w-48"
              >
                {shipmentData.createForm.warehouseOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <a
              href={stripBackendPrefix(
                `/expedition/card.php?action=create&shipping_method_id=&origin=commande&origin_id=${id}&projectid=&entrepot_id=${warehouse || shipmentData.createForm.defaultWarehouseId}`,
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
            >
              Create Shipment <ExternalLink size={11} className="opacity-70" />
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}

function ConsumptionTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderConsumption(id)
  const declareConsumption = useDeclareConsumption(id)

  const [product, setProduct] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [nbpiece, setNbpiece] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [label, setLabel] = useState('')
  const [eatby, setEatby] = useState('')
  const [sellby, setSellby] = useState('')
  const [formError, setFormError] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading stock consumptions…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load stock consumptions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  const { formOptions } = data
  const effectiveLabel = label || formOptions.defaultLabel

  function handleDeclare() {
    setFormError('')
    if (!warehouse || !product || !nbpiece.trim() || !batchNumber.trim()) {
      setFormError('Warehouse, Product, Number of units and Lot/Serial number are required.')
      return
    }
    declareConsumption.mutate(
      { token: formOptions.token, product, id_entrepot: warehouse, nbpiece, batch_number: batchNumber, label: effectiveLabel, eatby, sellby },
      {
        onSuccess: () => {
          setNbpiece('')
          setBatchNumber('')
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
          <PackageMinus size={14} className="text-brand" /> Consumptions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Warehouse*</span>
            <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={selectCls}>
              <option value="">Select a warehouse</option>
              {formOptions.warehouseOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Product*</span>
            <select value={product} onChange={(e) => setProduct(e.target.value)} className={selectCls}>
              <option value="">Select Predefined Product/services</option>
              {formOptions.productOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Number of units*</span>
            <input value={nbpiece} onChange={(e) => setNbpiece(e.target.value)} className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Lot/Serial number*</span>
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Label of movement</span>
            <input value={effectiveLabel} onChange={(e) => setLabel(e.target.value)} className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Eat-by date</span>
            <input value={eatby} onChange={(e) => setEatby(e.target.value)} placeholder="mm/dd/yyyy" className={selectCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Sell-by date</span>
            <input value={sellby} onChange={(e) => setSellby(e.target.value)} placeholder="mm/dd/yyyy" className={selectCls} />
          </label>
        </div>
        {(formError || declareConsumption.isError) && (
          <p className="text-xs text-danger mt-3">
            {formError || (declareConsumption.error instanceof Error ? declareConsumption.error.message : 'Could not declare this consumption.')}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={declareConsumption.isPending}
            onClick={handleDeclare}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            Declare
          </button>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">List of Consumption (For this Order)</h3>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No consumption declared for this order yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Ref.</th>
                  <th className="font-medium py-2 px-3">Date</th>
                  <th className="font-medium py-2 px-3">Product ref.</th>
                  <th className="font-medium py-2 px-3 text-center">Lot/Serial</th>
                  <th className="font-medium py-2 px-3">Warehouse</th>
                  <th className="font-medium py-2 px-3">Inv./Mov. code</th>
                  <th className="font-medium py-2 px-3">Label of movement</th>
                  <th className="font-medium py-2 px-3">Origin</th>
                  <th className="font-medium py-2 px-4 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4 text-text!">{row.ref}</td>
                    <td className="py-2 px-3 text-text-muted whitespace-nowrap">{row.date}</td>
                    <td className="py-2 px-3 text-text-muted">{row.productRef}</td>
                    <td className="py-2 px-3 text-center text-text-muted">{row.lotSerial}</td>
                    <td className="py-2 px-3 text-text-muted">{row.warehouse}</td>
                    <td className="py-2 px-3 text-text-muted">{row.invMovCode}</td>
                    <td className="py-2 px-3 text-text-muted">{row.labelOfMovement}</td>
                    <td className="py-2 px-3 text-text-muted">{row.origin}</td>
                    <td className="py-2 px-4 text-right text-text-muted">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function NotesTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderNotes(id)
  if (isLoading) return <LegacyLoadingCard label="Loading notes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
    <Card className="!h-auto">
      <h3 className="font-semibold text-text! mb-3 flex items-center gap-2">
        <StickyNote size={14} className="text-brand" /> Notes
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm font-medium text-text!">Note (public)</span>
            {data.notePublicEditUrl && <EditPencil url={data.notePublicEditUrl} title="Edit public note" />}
          </div>
          <p className="text-sm text-text! whitespace-pre-wrap">{data.notePublic || <span className="text-text-faint italic">No public note.</span>}</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm font-medium text-text!">Note (private)</span>
            {data.notePrivateEditUrl && <EditPencil url={data.notePrivateEditUrl} title="Edit private note" />}
          </div>
          <p className="text-sm text-text! whitespace-pre-wrap">{data.notePrivate || <span className="text-text-faint italic">No private note.</span>}</p>
        </div>
      </div>
    </Card>
  )
}

function DocumentsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useOrderDocuments(id)
  const { data: meta, isLoading: metaLoading, isError: metaIsError, error: metaError, refetch: refetchMeta } = useOrderDocumentsPageMeta(id)
  const uploadDoc = useUploadOrderDocument(id)
  const linkDoc = useLinkOrderDocument(id)

  const [file, setFile] = useState<File | null>(null)
  const [useMask, setUseMask] = useState(true)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  if (isLoading || metaLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (metaIsError || !meta) return <LegacyErrorCard title="Couldn't load documents" message={metaError instanceof Error ? metaError.message : 'Unknown error.'} onRetry={() => refetchMeta()} />

  function handleUpload() {
    if (!file) return
    uploadDoc.mutate(
      { token: meta!.attachToken, file, savingDocMask: meta!.savingDocMask, useMask },
      { onSuccess: () => setFile(null) },
    )
  }

  function handleLink() {
    if (!linkUrl.trim()) return
    linkDoc.mutate(
      { token: meta!.attachToken, link: linkUrl.trim(), label: linkLabel.trim() },
      { onSuccess: () => { setLinkUrl(''); setLinkLabel('') } },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <InfoRow label="Number of attached files/documents" value={String(meta.attachedCount)} />
        <InfoRow label="Total size of attached files/documents" value={meta.totalSize} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Attach a new file/document</h3>
          <div className="space-y-3">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-surface-hover file:text-text hover:file:bg-border"
            />
            {meta.savingDocMask && (
              <label className="flex items-start gap-2 text-xs text-text-faint">
                <input type="checkbox" checked={useMask} onChange={(e) => setUseMask(e.target.checked)} className="mt-0.5" />
                <span>
                  Save file on server with name "<b className="text-text-muted">{meta.savingDocMask}</b>" (otherwise original filename)
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={!file || uploadDoc.isPending}
              onClick={handleUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {uploadDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />} Upload
            </button>
            {uploadDoc.isError && <p className="text-xs text-danger">Could not upload the file — please try again.</p>}
            {uploadDoc.isSuccess && <p className="text-xs text-success">File uploaded.</p>}
          </div>
        </Card>

        <Card className="!h-auto">
          <h3 className="font-semibold text-text! mb-3">Link a new file/document</h3>
          <div className="space-y-3">
            <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL to link" className={selectCls} />
            <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className={selectCls} />
            <button
              type="button"
              disabled={!linkUrl.trim() || linkDoc.isPending}
              onClick={handleLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {linkDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Link2 size={13} />} Link
            </button>
            {linkDoc.isError && <p className="text-xs text-danger">Could not link the file — please try again.</p>}
            {linkDoc.isSuccess && <p className="text-xs text-success">Link added.</p>}
          </div>
        </Card>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Attached files and documents</h3>
        </div>
        <div className="p-4">
          {data.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No documents uploaded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Document</th>
                  <th className="font-medium py-2 pr-3">Size</th>
                  <th className="font-medium py-2">Date</th>
                  <th className="font-medium py-2 pl-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((doc) => (
                  <tr key={doc.url} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {doc.name}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-text-muted">{doc.size}</td>
                    <td className="py-2 text-text-muted">{doc.date}</td>
                    <td className="py-2 pl-3">
                      <div className="flex items-center justify-center gap-2">
                        <a href={stripBackendPrefix(doc.url)} target="_blank" rel="noreferrer" title="Preview" className="text-text-faint hover:text-text">
                          <Eye size={14} />
                        </a>
                        {doc.deleteUrl && (
                          <button type="button" title="Delete" onClick={() => deleteOrderDocument(doc.deleteUrl, doc.name, refetch)} className="text-text-faint hover:text-danger">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Linked files and documents</h3>
        </div>
        <div className="p-4">
          {meta.links.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No registered links.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Links</th>
                  <th className="font-medium py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {meta.links.map((link, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {link.label}
                      </a>
                    </td>
                    <td className="py-2 text-text-muted">{link.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function EventsAgendaTab({ id, data }: { id: string | undefined; data: OrderDetailData }) {
  const { data: agenda, isLoading, isError, error, refetch } = useOrderAgendaPage(id)
  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !agenda) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <InfoRow label="Created by" value={<EventByAvatar name={agenda.createdBy} />} />
        <InfoRow label="Creation date" value={agenda.creationDate} />
        <InfoRow label="Latest modification date" value={agenda.latestModificationDate} />
        <InfoRow label="Validated by" value={<EventByAvatar name={agenda.validatedBy} />} />
        <InfoRow label="Validation date" value={agenda.validationDate} />
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-brand" />
            <h3 className="font-semibold text-text!">Events on order</h3>
          </div>
          {data.addEventUrl && (
            <a
              href={stripBackendPrefix(data.addEventUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
            >
              <Plus size={12} /> Add Event
            </a>
          )}
        </div>
        {agenda.events.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No events recorded for this order yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 px-4">Ref.</th>
                  <th className="font-medium py-2 px-3">Date</th>
                  <th className="font-medium py-2 px-3">Owner</th>
                  <th className="font-medium py-2 px-3">Label</th>
                  <th className="font-medium py-2 px-3">Related Objects</th>
                  <th className="font-medium py-2 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {agenda.events.map((event, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 px-4">
                      {event.url ? (
                        <a href={stripBackendPrefix(event.url)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {event.ref}
                        </a>
                      ) : (
                        <span className="text-text!">{event.ref}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-text-muted whitespace-nowrap">{event.date}</td>
                    <td className="py-2 px-3 text-text-muted">
                      <EventByAvatar name={event.owner} />
                    </td>
                    <td className="py-2 px-3 text-text-muted">{event.label}</td>
                    <td className="py-2 px-3">
                      {event.relatedObjectUrl ? (
                        <a href={stripBackendPrefix(event.relatedObjectUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {event.relatedObjectRef}
                        </a>
                      ) : (
                        <span className="text-text-muted">{event.relatedObjectRef || '—'}</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center text-text-muted">{event.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

type LazyTabRendererProps = {
  tab: TabKey
  id: string | undefined
  data: OrderDetailData
}

export function LazyTabRenderer({ tab, id, data }: LazyTabRendererProps) {
  switch (tab) {
    case 'contacts':
      return <ContactsTab id={id} />
    case 'shipments':
      return <ShipmentsTab id={id} data={data} />
    case 'consumption':
      return <ConsumptionTab id={id} />
    case 'notes':
      return <NotesTab id={id} />
    case 'documents':
      return <DocumentsTab id={id} />
    case 'agenda':
      return <EventsAgendaTab id={id} data={data} />
    default:
      return null
  }
}
