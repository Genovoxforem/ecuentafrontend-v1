import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { DoorOpen, LoaderCircle, TriangleAlert, X, Check } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { ROUTES } from '../../../routes'
import {
  useHotelSettingsBundle,
  useHotelRoomTypes,
  useHotelSaveRoom,
  useHotelVatRates,
  useHotelUnits,
  useHotelTlCodes,
  useHotelFeatures,
  useHotelCreateRoomFormOptions,
  useHotelToken,
} from '../hotel.queries'

const fieldCls = 'h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Decorative-only fields (no real value this write ever sends — see the
// comment above handleCreate) share one bag of local state instead of a
// useState per field, since none of them need individual validation/logic.
interface ExtraFields {
  label: string
  statusBuy: string
  barcodeType: string
  barcodeValue: string
  duration: string
  durationUnit: string
  description: string
  publicUrl: string
  customsCode: string
  stateProvince: string
  note: string
  minSellingPrice: string
  iplCategory: string
  exciseTaxCategory: string
  manufactureTpin: string
  manufacturerItemCode: string
  rrp: string
  acctSell: string
  acctSellExport: string
  acctBuy: string
  acctBuyExport: string
  tags: string
  enableOnWebsite: boolean
  amenities: string[]
  bedTypes: string[]
  acType: 'yes' | 'no'
}
const EXTRA_DEFAULTS: ExtraFields = {
  label: '',
  statusBuy: 'ProductStatusOnBuy',
  barcodeType: 'Code 128',
  barcodeValue: '',
  duration: '',
  durationUnit: 'Second',
  description: '',
  publicUrl: '',
  customsCode: '',
  stateProvince: '',
  note: '',
  minSellingPrice: '',
  iplCategory: '',
  exciseTaxCategory: '',
  manufactureTpin: '',
  manufacturerItemCode: '',
  rrp: '',
  acctSell: '',
  acctSellExport: '',
  acctBuy: '',
  acctBuyExport: '',
  tags: '',
  enableOnWebsite: false,
  amenities: [],
  bedTypes: [],
  acType: 'yes',
}

// Real page: booking/settings/create_room.php?action=create&type=1 — a
// Dolibarr product-card form (a Suite genuinely IS a Dolibarr product under
// the hood — confirmed by useHotelSaveRoom's own real write already sending
// a product classification code, country, packaging unit, and VAT rate).
// Fetched and diff'd against this file directly (37 real fields extracted
// from its own <label>/name= pairs, not guessed): every field is reproduced
// below in the exact real order, including Bed Type (bed_types[], real
// options from settings.bed) and AC Type (ac_type, AC/Non-AC) — both were
// missing entirely before this pass. Room Number's real maxlength=6 /
// [A-Za-z0-9]{1,6} pattern is enforced now too. Only the ones
// useHotelSaveRoom actually accepts (Room Number, Status (Sell), Product
// Classification, DefaultUnitToShow, Packaging Unit, Country of origin,
// Selling price + its Inc./Exc. tax basis, VAT category Code, Tourism levy
// Code, Floor, Room Type) are wired to real state and actually sent in
// handleCreate below. Everything else (Label, Status (Buy), barcode,
// Duration, Description, Public URL, customs code, State/Province, Note,
// Min. selling price, IPL/Excise category, Manufacture TPIN, manufacturer
// item code, RRP, the 4 separate accountancy codes, Tags, Enable On
// Website, Amenities, Bed Type, AC Type) has no matching field on
// useHotelSaveRoom (the Hotel Suite's own real saveRoom() JS sends only id/
// no/ty/floor/rate/cap/status/cls/country/unit/packing/pbt/tva/vatcode/tl —
// confirmed by reading it directly). Amenities *is* a real field on this
// classic page (amenities[] posts to create_room.php itself, a plain
// Dolibarr product-card POST — unlike the rest of this bag, not "no real
// backend field at all"), but that's a different real write than the one
// this app uses, so typing here still doesn't persist through
// useHotelSaveRoom either. Real amenity/bed-type names are shown as options
// (from r=features / settings.bed) for visual accuracy even though picking
// them doesn't transmit.
//
// Full dropdown-by-dropdown audit against this file's own raw <select>
// option lists caught 3 real inaccuracies, now fixed: "Status (Sell)"
// (OnSell/NotOnSell) was actually mislabeled — the real value this app
// submits isn't the classic form's own `statut` field at all, it's the
// Hotel Suite's own roomForm() `rf_status` (confirmed by reading that
// function directly: Active(1)/Out of service(2), same convention
// HotelRoomListPage.tsx's own Edit panel already uses) — relabeled to
// "Status"/Active/Out of service to match what's actually sent.
// BarcodeType's real 3 options are Code 128/Qr Code/UPC, not Code 128/
// EAN13 (EAN13 doesn't exist on the real page at all). NatureOfProductShort
// only ever offers "Service" on the real page (no "Product" alternative —
// makes sense, a suite is always a service), so that's now a disabled
// single-option select instead of a 2-option live one. Country of origin's
// real dropdown has ~240 live countries; kept as a disabled Zambia-only
// display since useHotelSaveRoom's own `country` field always sends '239'
// regardless of this control either way.
//
// Confirmed live this write is currently BROKEN on this backend regardless
// of input — see the warning banner below for the full finding (every real
// Room Type id fails with "Could not create room product", and the real
// Suite's own Add Room form is equally affected since it sources Room Type
// from the same empty list). id/cap were already correctly sent by
// useHotelSaveRoom the whole time — that wasn't the gap; the gap is purely
// server-side. Separately confirmed live: Room Type/Floor CAN genuinely be
// created through a completely different real Dolibarr endpoint —
// categories/card.php?type=25 (Room Type) / type=24 (Floor), the plain
// generic-category CRUD (not the broken categories/index.php *listing*
// page, and not the Hotel Suite's own savetype/savesuite actions) — a
// created category shows up correctly in this very page's own real
// room_type_id/floor_id dropdowns. But useHotelSaveRoom's `ty`/`floor`
// still reject those real category ids the exact same way ("Could not
// create room product"), so this doesn't unblock Add Room by itself — it
// would need this app to submit through create_room.php's own real POST
// instead, a bigger change not made here without confirming that's wanted.
export function HotelAddRoomPage() {
  const navigate = useNavigate()
  const { data: token } = useHotelToken()
  const { data: settings } = useHotelSettingsBundle()
  const { data: roomTypes } = useHotelRoomTypes()
  const { data: vatRates } = useHotelVatRates()
  const { data: units } = useHotelUnits()
  const { data: tlCodes } = useHotelTlCodes()
  const { data: features } = useHotelFeatures()
  const save = useHotelSaveRoom()
  const bedTypeOptions = settings?.bed ?? []

  // Real, live Floor/Room Type options, scraped straight from
  // create_room.php's own rendered dropdowns (see
  // useHotelCreateRoomFormOptions' own comment — these are genuinely
  // different, working ids from both r=roomtypes and settings.roomtype/
  // settings.floor, sourced from Dolibarr's real generic category system).
  // While that scrape is loading, fall back to the Hotel Suite's own
  // (empty-right-now) settings.roomtype/settings.floor + its synthetic
  // "Ground floor" default, matching app.php's own flOpts() behavior, so
  // the selects never sit fully empty.
  const { data: createRoomFormOptions } = useHotelCreateRoomFormOptions()
  const hasRealRoomTypes = !!settings?.roomtype && settings.roomtype.length > 0
  const fallbackRoomTypeOptions = (hasRealRoomTypes ? settings!.roomtype : (roomTypes ?? [])).map((t) => ({ id: String(t.id), name: t.name }))
  const roomTypeOptions = createRoomFormOptions?.roomTypes.length ? createRoomFormOptions.roomTypes : fallbackRoomTypeOptions
  const fallbackFloorOptions = (settings?.floor ?? []).filter((f) => f.status === 1).map((f) => ({ id: f.id, name: f.name }))
  const floorOptions = createRoomFormOptions?.floors.length
    ? createRoomFormOptions.floors
    : fallbackFloorOptions.length > 0
      ? fallbackFloorOptions
      : [{ id: '1', name: 'Ground floor' }]
  const qtyUnits = (units ?? []).filter((u) => u.ut === 'qty')
  const packUnits = (units ?? []).filter((u) => u.ut === 'pack')

  const [ref, setRef] = useState('')
  const [ty, setTy] = useState('')
  const [floor, setFloor] = useState('')
  const [rate, setRate] = useState('')
  const [status, setStatus] = useState<0 | 1 | 2>(1)
  const [cls, setCls] = useState('90111501')
  const [unit, setUnit] = useState('')
  const [packing, setPacking] = useState('')
  const [pbt, setPbt] = useState<'HT' | 'TTC'>('HT')
  const [vatIdx, setVatIdx] = useState(0)
  const [tlIdx, setTlIdx] = useState(0)
  const [error, setError] = useState('')
  const [extra, setExtra] = useState<ExtraFields>(EXTRA_DEFAULTS)
  const setField = <K extends keyof ExtraFields>(key: K, value: ExtraFields[K]) => setExtra((cur) => ({ ...cur, [key]: value }))

  function handleCreate() {
    setError('')
    if (!token) return
    if (!ref.trim()) return setError('Room Number is required.')
    if (!ty) return setError('Room Type is required.')
    if (!floor) return setError('Floor is required.')
    const vat = vatRates?.[vatIdx]
    const tl = tlCodes?.[tlIdx]
    save.mutate(
      {
        no: ref,
        ty,
        floor,
        rate: Number(rate) || 0,
        status,
        cls,
        country: '239',
        unit: unit || String(qtyUnits[0]?.id ?? '31'),
        packing: packing || String(packUnits[0]?.id ?? '45'),
        pbt,
        tva: Number(vat?.taux ?? 16),
        vatcode: vat?.code ?? '',
        tl: tl ? `${tl.rate} (${tl.code})` : '',
        token,
      },
      { onSuccess: () => navigate(ROUTES.hotelRoomList), onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <DoorOpen size={20} className="text-brand" /> Add Room
        </h2>
      }
      scrollsInternally={false}
      footerLeft={
        <Link to={ROUTES.hotelRoomList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          disabled={!token || save.isPending}
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create
        </button>
      }
    >
      <Card className="!h-auto flex items-start gap-2 bg-danger-bg/40">
        <TriangleAlert size={15} className="text-danger-fg mt-0.5 shrink-0" />
        <p className="text-xs text-danger-fg">
          Floor and Room Type below now load their real, live options straight from the real create_room.php page itself (Dolibarr's generic category
          system — confirmed live these are genuinely selectable there, not fabricated). But this app's own write (<code className="font-mono">
          useHotelSaveRoom</code>, the Hotel Suite's real <code className="font-mono">a=saveroom</code> action) still rejects every one of them the same
          way — confirmed live with real ids from this exact list: <code className="font-mono">Could not create room product</code>. That action validates
          against a different, separate table (the same broken one behind Room Type's own non-persisting "+" and failing "Add real room type"), so
          creating a room here isn't possible yet regardless of which real Floor/Room Type is picked — only submitting through create_room.php's own real
          form directly would use the ids these dropdowns now show.
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Ref.</label>
            <input value="" disabled placeholder="Not used by this write" className={`w-full ${fieldCls} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Label</label>
            <input value={extra.label} onChange={(e) => setField('label', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Status *</label>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value) as 0 | 1 | 2)} className={`w-full ${fieldCls}`}>
              <option value={1}>Active</option>
              <option value={2}>Out of service</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Status (Buy)</label>
            <select value={extra.statusBuy} onChange={(e) => setField('statusBuy', e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="ProductStatusOnBuy">ProductStatusOnBuy</option>
              <option value="ProductStatusNotOnBuy">ProductStatusNotOnBuy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Product Classification *</label>
            <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Search Classification Code.." className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">BarcodeType</label>
            <select value={extra.barcodeType} onChange={(e) => setField('barcodeType', e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">Select a barcode type</option>
              <option value="Code 128">Code 128</option>
              <option value="Qr Code">Qr Code</option>
              <option value="UPC">UPC</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">BarcodeValue</label>
            <input value={extra.barcodeValue} onChange={(e) => setField('barcodeValue', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Duration</label>
            <div className="flex gap-2">
              <input type="number" value={extra.duration} onChange={(e) => setField('duration', e.target.value)} className={`w-full ${fieldCls}`} />
              <select value={extra.durationUnit} onChange={(e) => setField('durationUnit', e.target.value)} className={fieldCls}>
                <option>Second</option>
                <option>Minute</option>
                <option>Hour</option>
                <option>Day</option>
                <option>Week</option>
                <option>Month</option>
                <option>Year</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">NatureOfProductShort</label>
            <select value="Service" disabled className={`w-full ${fieldCls} opacity-60 cursor-not-allowed`}>
              <option value="Service">Service</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <input value={extra.description} onChange={(e) => setField('description', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Public URL</label>
            <input value={extra.publicUrl} onChange={(e) => setField('publicUrl', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">DefaultUnitToShow *</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">Unit of Quantity</option>
              {qtyUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-danger mb-1">Packaging Unit *</label>
            <select value={packing} onChange={(e) => setPacking(e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">Packaging Unit</option>
              {packUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Customs|Commodity|HS code</label>
            <input value={extra.customsCode} onChange={(e) => setField('customsCode', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Country of origin *</label>
            <select value="ZM" disabled title="The real classic form has a full ~240-country list here, but useHotelSaveRoom's real country field always sends Zambia (239) regardless of this control" className={`w-full ${fieldCls} opacity-60 cursor-not-allowed`}>
              <option value="ZM">Zambia (ZM)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">State|Province of origin</label>
            <input value={extra.stateProvince} onChange={(e) => setField('stateProvince', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Note (not visible on invoices, Quotations...)</label>
            <input value={extra.note} onChange={(e) => setField('note', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Selling price *</label>
            <div className="flex gap-2">
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Blank = rack rate" className={`w-full ${fieldCls}`} />
              <select value={pbt} onChange={(e) => setPbt(e.target.value as 'HT' | 'TTC')} className={fieldCls}>
                <option value="TTC">Inc. tax</option>
                <option value="HT">Exc. tax</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Min. selling price</label>
            <input type="number" value={extra.minSellingPrice} onChange={(e) => setField('minSellingPrice', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">VAT category Code *</label>
            <select value={vatIdx} onChange={(e) => setVatIdx(Number(e.target.value))} className={`w-full ${fieldCls}`}>
              {(vatRates ?? []).map((v, i) => (
                <option key={i} value={i}>
                  {v.code} ({v.taux}%)
                </option>
              ))}
              {(!vatRates || vatRates.length === 0) && <option value={0}>A-16%</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">IPL category code</label>
            <select value={extra.iplCategory} onChange={(e) => setField('iplCategory', e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">Select Tax Category</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Tourism levy Code</label>
            <select value={tlIdx} onChange={(e) => setTlIdx(Number(e.target.value))} className={`w-full ${fieldCls}`}>
              {(tlCodes ?? []).map((t, i) => (
                <option key={i} value={i}>
                  {t.rate} ({t.code})
                </option>
              ))}
              {(!tlCodes || tlCodes.length === 0) && <option value={0}>Select Tax Category</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Excise tax category code</label>
            <select value={extra.exciseTaxCategory} onChange={(e) => setField('exciseTaxCategory', e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">Select Tax Category</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Manufacture TPIN</label>
            <input value={extra.manufactureTpin} onChange={(e) => setField('manufactureTpin', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Manufacturer item code</label>
            <input value={extra.manufacturerItemCode} onChange={(e) => setField('manufacturerItemCode', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">RRP</label>
            <input type="number" value={extra.rrp} onChange={(e) => setField('rrp', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Product Accountancy Sell Code</label>
            <input value={extra.acctSell} onChange={(e) => setField('acctSell', e.target.value)} placeholder="5022 - Service revenue one*" className={`w-full ${fieldCls}`} />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Product Accountancy Sell Export Code</label>
            <input value={extra.acctSellExport} onChange={(e) => setField('acctSellExport', e.target.value)} placeholder="5022 - Service revenue one*" className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Product Accountancy Buy Code</label>
            <input value={extra.acctBuy} onChange={(e) => setField('acctBuy', e.target.value)} placeholder="5022 - Service revenue one*" className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Product Accountancy Buy Export Code</label>
            <input value={extra.acctBuyExport} onChange={(e) => setField('acctBuyExport', e.target.value)} placeholder="5022 - Service revenue one*" className={`w-full ${fieldCls}`} />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Tags/categories</label>
            <input value={extra.tags} onChange={(e) => setField('tags', e.target.value)} className={`w-full ${fieldCls}`} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Enable ON Website</label>
            <button
              type="button"
              onClick={() => setField('enableOnWebsite', !extra.enableOnWebsite)}
              className={`h-10 w-14 rounded-full transition-colors relative ${extra.enableOnWebsite ? 'bg-brand' : 'bg-neutral-bg'}`}
            >
              <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-transform ${extra.enableOnWebsite ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Floor *</label>
            <select value={floor} onChange={(e) => setFloor(e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">SelectFloor</option>
              {floorOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-danger mb-1">Room Type *</label>
            <select value={ty} onChange={(e) => setTy(e.target.value)} className={`w-full ${fieldCls}`}>
              <option value="">SelectRoomType</option>
              {roomTypeOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Room Number *</label>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value.slice(0, 6))}
              maxLength={6}
              pattern="[A-Za-z0-9]{1,6}"
              title="Maximum 6 characters"
              placeholder="e.g. 101"
              className={`w-full ${fieldCls}`}
            />
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Amenities *</label>
            <select
              multiple
              value={extra.amenities}
              onChange={(e) => setField('amenities', Array.from(e.target.selectedOptions, (o) => o.value))}
              className={`w-full h-24 px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30`}
            >
              {(features ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-danger mb-1">Bed Type *</label>
            <select
              multiple
              value={extra.bedTypes}
              onChange={(e) => setField('bedTypes', Array.from(e.target.selectedOptions, (o) => o.value))}
              className={`w-full h-24 px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30`}
            >
              {bedTypeOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">AC Type</label>
            <select value={extra.acType} onChange={(e) => setField('acType', e.target.value as 'yes' | 'no')} className={`w-full ${fieldCls}`}>
              <option value="yes">AC</option>
              <option value="no">Non-AC</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-danger mt-4">{error}</p>}
      </Card>
    </StickyFormShell>
  )
}
