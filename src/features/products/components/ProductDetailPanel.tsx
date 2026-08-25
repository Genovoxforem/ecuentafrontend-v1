import { useState } from 'react'
import { X, Image as ImageIcon, Warehouse as WarehouseIcon, Package, Tag, Hash } from 'lucide-react'
import { useProductDetailPanel } from '../products.queries'
import { NOT_SIGNED_IN_MESSAGE } from '../../../shared/legacyHtmlFetch'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{children || '—'}</span>
    </div>
  )
}

// Inline row-click detail panel — mirrors legacy's own #productDetailsModal
// (product/allproducts.php), which expands ABOVE the table rather than
// navigating anywhere or opening a route/modal. See ProductsList.tsx's
// expandedId state for how this mounts. Visual language matches the
// redesigned ProductDetail.tsx page (Card shell, icon-badge header, filled
// pill tabs, bordered/tinted tables) for consistency across the feature.
export function ProductDetailPanel({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useProductDetailPanel(productId)
  const [tab, setTab] = useState<'images' | 'warehouse'>('images')

  return (
    <Card className="!h-auto mb-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${data?.kind === 'service' ? 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400' : 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400'}`}>
            <Package size={14} />
          </span>
          <h3 className="text-sm font-semibold text-text!">Product Details</h3>
          {data && !data.notFound && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${data.zraCodeIsDefault ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${data.zraCodeIsDefault ? 'bg-success' : 'bg-warning'}`} />
              {data.zraCodeIsDefault ? 'ZRA synced' : 'ZRA pending'}
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-hover hover:text-text">
          <X size={16} />
        </button>
      </div>

      {isLoading && <p className="text-sm text-text-faint px-1 py-3">Loading product details…</p>}
      {isError && <p className="text-sm text-danger px-1 py-3">{error instanceof Error ? error.message : NOT_SIGNED_IN_MESSAGE}</p>}
      {data?.notFound && <p className="text-sm text-text-faint px-1 py-3">Product not found.</p>}

      {data && !data.notFound && (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_2fr] gap-4 mt-2">
          <div className="rounded-lg border border-border bg-surface p-3">
            <InfoRow label="Product ref.">{data.ref}</InfoRow>
            <InfoRow label="Product label">{data.label}</InfoRow>
            <InfoRow label="ZRA Product Code">
              {data.zraProductCode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-info-bg text-info-fg">
                  <Hash size={10} /> {data.zraProductCode}
                </span>
              )}
            </InfoRow>
            <InfoRow label="Product Price (Incl. tax)">{data.priceInclTax}</InfoRow>
            <InfoRow label="RRP">{data.rrp}</InfoRow>
            <InfoRow label="Classification Code">
              {data.classificationCode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">
                  <Tag size={10} /> {data.classificationCode}
                </span>
              )}
            </InfoRow>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-3">
              <button
                type="button"
                onClick={() => setTab('images')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  tab === 'images' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:bg-surface-hover hover:text-text'
                }`}
              >
                <ImageIcon size={14} /> Images
              </button>
              <button
                type="button"
                onClick={() => setTab('warehouse')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  tab === 'warehouse' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:bg-surface-hover hover:text-text'
                }`}
              >
                <WarehouseIcon size={14} /> Warehouse
              </button>
            </div>

            {tab === 'images' &&
              (data.images.length === 0 ? (
                <p className="text-sm text-text-faint italic px-1">No images uploaded for this product.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.images.map((img, i) => (
                    <a
                      key={i}
                      href={img.fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-24 h-24 rounded-lg border border-border overflow-hidden bg-surface transition-transform hover:scale-105 hover:shadow-sm"
                    >
                      <img src={img.thumbUrl} alt="" className="w-full h-full object-contain" />
                    </a>
                  ))}
                </div>
              ))}

            {tab === 'warehouse' && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm [&_tbody_tr:hover]:bg-surface-hover">
                  <thead>
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2.5">Warehouse</th>
                      <th className="font-medium px-3 py-2.5 text-right">Number Of Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.warehouseStock.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-text-faint italic">
                          No warehouse stock.
                        </td>
                      </tr>
                    ) : (
                      data.warehouseStock.map((w, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text!">{w.warehouse}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text!">{w.quantity}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-text! text-right">Total:</td>
                      <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{data.totalStock}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
