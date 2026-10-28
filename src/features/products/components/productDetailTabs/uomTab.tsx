import { useState, useEffect } from 'react'
import { Save, Tag, Pencil, Trash2, Ruler, CheckCircle2, Circle, Barcode, Wand2, Layers, Boxes, Plus } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../LegacyReportStates'
import { useProductUomOverview, useSaveProductBarcode, useGenerateProductBarcode, useDeleteUomConversion, useSaveUomConversion, type ProductUomOverview } from '../../products.queries'
import { Th, Td, EmptyRow, FieldRow, SectionHeader, MetricTile, ModalShell, ModalField, modalInputCls } from '../ProductDetailShared'
import { BatchTrackingButton } from './ProductDetailTabsShared'

function UomConversionModal({
  id,
  conversion,
  packingOptions,
  uomOptions,
  onClose,
}: {
  id: string
  conversion: ProductUomOverview['conversions'][number] | null
  packingOptions: { value: string; label: string }[]
  uomOptions: { value: string; label: string }[]
  onClose: () => void
}) {
  const saveConversion = useSaveUomConversion()
  const [packingUnit, setPackingUnit] = useState(conversion ? String(conversion.packingUnitId) : '')
  const [uomUnit, setUomUnit] = useState(conversion ? String(conversion.uomUnitId) : '')
  const [factor, setFactor] = useState(conversion ? String(conversion.factor) : '')
  const [isDefault, setIsDefault] = useState(conversion?.isDefault ?? false)
  const [priceTtc, setPriceTtc] = useState(conversion?.priceOverrideTtc ? String(conversion.priceOverrideTtc) : '')
  const [barcode, setBarcode] = useState(conversion?.barcode ?? '')
  const [note, setNote] = useState(conversion?.note ?? '')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!packingUnit) return setError('Packing Unit is required!')
    if (!uomUnit) return setError('Base UOM is required!')
    if (!factor || Number(factor) <= 0) return setError('Factor must be a positive number!')
    saveConversion.mutate(
      { id, convId: conversion?.id ?? 0, packingUnit, uomUnit, factor, isDefault, priceTtc, barcode, note },
      { onSuccess: onClose, onError: (err) => setError(err instanceof Error ? err.message : 'Save failed.') },
    )
  }

  return (
    <ModalShell
      title={conversion ? 'Edit UOM Conversion' : 'Add UOM Conversion'}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={saveConversion.isPending}
          className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
        >
          {saveConversion.isPending ? 'Saving...' : 'Save'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Packing Unit">
          <select value={packingUnit} onChange={(e) => setPackingUnit(e.target.value)} className={modalInputCls}>
            <option value="">Select...</option>
            {packingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Base UOM">
          <select value={uomUnit} onChange={(e) => setUomUnit(e.target.value)} className={modalInputCls}>
            <option value="">Select...</option>
            {uomOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Factor">
          <input value={factor} onChange={(e) => setFactor(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Price Override TTC">
          <input value={priceTtc} onChange={(e) => setPriceTtc(e.target.value)} className={modalInputCls} />
        </ModalField>
        <ModalField label="Barcode">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={modalInputCls} />
        </ModalField>
        <label className="flex items-center gap-2 text-sm text-text mt-5">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-border" />
          Default
        </label>
      </div>
      <ModalField label="Note">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={modalInputCls} />
      </ModalField>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </ModalShell>
  )
}

export function UomSettingsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductUomOverview(id)
  const deleteConversion = useDeleteUomConversion()
  const confirm = useConfirm()
  const saveBarcode = useSaveProductBarcode()
  const generateBarcode = useGenerateProductBarcode()
  const [barcodeDraft, setBarcodeDraft] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [conversionModal, setConversionModal] = useState<{ mode: 'add' } | { mode: 'edit'; conversion: NonNullable<typeof data>['conversions'][number] } | null>(null)

  useEffect(() => setBarcodeDraft(data?.productBarcode ?? ''), [data?.productBarcode])

  if (isLoading) return <LegacyLoadingCard label="Loading UOM settings..." />
  if (isError) return <LegacyErrorCard title="Couldn't load UOM settings" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  async function handleDeleteConversion(convId: number) {
    if (!(await confirm({ title: 'Delete UOM Conversion?', message: 'Are you sure you want to delete this UOM conversion?' }))) return
    deleteConversion.mutate({ id: id!, convId })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile icon={Ruler} color="blue" label="Base Unit" value={data.baseUnitLabel} caption="Base Unit" />
        <MetricTile icon={Layers} color="green" label="Conversions" value={data.conversionsCount} caption="Total Conversions" />
        <MetricTile icon={Boxes} color="indigo" label="Available Stock" value={data.availableStock} caption="On hand, in the base unit" />
      </div>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-2.5">
          <SectionHeader icon={Ruler} color="violet">
            UOM Conversions
          </SectionHeader>
          {data.canEdit && (
            <button
              type="button"
              onClick={() => setConversionModal({ mode: 'add' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand-hover"
            >
              <Plus size={14} /> Add UOM Conversion
            </button>
          )}
        </div>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <Th>Packing Unit</Th>
                <Th>Base UOM</Th>
                <Th right>Factor</Th>
                <Th right>Purchase Price TTC</Th>
                <Th right>Selling Price TTC</Th>
                <Th right>Price Override TTC</Th>
                <Th>Barcode</Th>
                <Th>Note</Th>
                <Th>Default</Th>
                {data.canEdit && <Th right>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {data.conversions.length === 0 ? (
                <EmptyRow span={data.canEdit ? 10 : 9} label="No UOM Conversions Defined" />
              ) : (
                data.conversions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <Td>{c.packingLabel}</Td>
                    <Td muted>{c.uomLabel}</Td>
                    <Td right>{c.factor}</Td>
                    <Td right muted>
                      {c.purchasePriceTtc ? formatMoney(c.purchasePriceTtc) : '—'}
                    </Td>
                    <Td right muted>
                      {c.sellingPriceTtc ? formatMoney(c.sellingPriceTtc) : '—'}
                    </Td>
                    <Td right muted>
                      {c.priceOverrideTtc ? formatMoney(c.priceOverrideTtc) : '—'}
                    </Td>
                    <Td muted>{c.barcode || '—'}</Td>
                    <Td muted>{c.note || '—'}</Td>
                    <Td muted>{c.isDefault ? <CheckCircle2 size={14} className="text-success" /> : ''}</Td>
                    {data.canEdit && (
                      <Td right>
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConversionModal({ mode: 'edit', conversion: c })}
                            title="Edit conversion"
                            className="p-1 rounded text-text-faint hover:bg-info-bg hover:text-info disabled:opacity-60"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConversion(c.id)}
                            disabled={deleteConversion.isPending}
                            title="Delete conversion"
                            className="p-1 rounded text-text-faint hover:bg-danger-bg hover:text-danger disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </Td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {conversionModal && (
        <UomConversionModal
          id={id!}
          conversion={conversionModal.mode === 'edit' ? conversionModal.conversion : null}
          packingOptions={data.packingUnitOptions}
          uomOptions={data.uomUnitOptions}
          onClose={() => setConversionModal(null)}
        />
      )}

      <Card className="!h-auto">
        <SectionHeader icon={Barcode} color="amber">
          Barcode Management
        </SectionHeader>
        <div className="space-y-2">
          <label className="text-xs text-text-faint">Set Barcode</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={barcodeDraft}
              onChange={(e) => setBarcodeDraft(e.target.value)}
              placeholder="Enter barcode value"
              disabled={!data.canEdit}
              className="flex-1 min-w-[180px] rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text! disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!data.canEdit || saveBarcode.isPending}
              onClick={() => {
                setBarcodeError('')
                saveBarcode.mutate(
                  { id: id!, barcode: barcodeDraft },
                  { onError: (err) => setBarcodeError(err instanceof Error ? err.message : 'Failed to save barcode.') },
                )
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-60"
            >
              <Save size={14} /> {saveBarcode.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={!data.canEdit || generateBarcode.isPending}
              onClick={() => {
                setBarcodeError('')
                generateBarcode.mutate(id!, {
                  onSuccess: (result) => setBarcodeDraft(result.barcode),
                  onError: (err) => setBarcodeError(err instanceof Error ? err.message : 'Failed to generate barcode.'),
                })
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text disabled:opacity-60"
            >
              <Wand2 size={14} /> {generateBarcode.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {barcodeError && <p className="text-xs text-danger">{barcodeError}</p>}
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={Tag} color="rose">
          Lot/Batch Tracking
        </SectionHeader>
        <FieldRow label="Lot/Batch Tracking Enabled">
          <span className={`inline-flex items-center gap-1.5 font-medium ${data.hasBatchTracking ? 'text-success' : 'text-text-muted'}`}>
            {data.hasBatchTracking ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {data.hasBatchTracking ? 'Yes' : 'No'}
          </span>
        </FieldRow>
        {data.canEdit && <BatchTrackingButton id={id!} enabled={data.hasBatchTracking} />}
      </Card>
    </div>
  )
}
