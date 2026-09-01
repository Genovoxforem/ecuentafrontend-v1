import { useEffect, useMemo, useState } from 'react'
import { Search, Package, Plus, Minus, Trash2, ShoppingCart, UtensilsCrossed, ShoppingBag, Table2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../utils/format'
import {
  useWaiterTables,
  useWaiterCategories,
  useWaiterProducts,
  useWaiterTableInvoice,
  usePlaceWaiterOrder,
  type WaiterProduct,
  type WaiterCartItem,
} from '../waiterOrder.queries'

function ProductCard({ product, onAdd }: { product: WaiterProduct; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex flex-col items-stretch text-left rounded-xl border border-border bg-surface hover:border-brand hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="aspect-square bg-surface-alt grid place-items-center overflow-hidden">
        {product.hasImage && product.imageUrl ? (
          <img src={product.imageUrl} alt={product.label} className="w-full h-full object-cover" />
        ) : (
          <Package size={28} className="text-text-faint" />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium text-text! truncate">{product.label}</p>
        <p className="text-xs text-text-faint truncate">Ref: {product.ref}</p>
        <p className="text-sm font-semibold text-brand mt-1">{formatMoney(product.priceTtc)} ZMW</p>
      </div>
    </button>
  )
}

function CartRow({ item, onQtyChange, onRemove }: { item: WaiterCartItem; onQtyChange: (qty: number) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text! truncate">{item.label}</p>
        <p className="text-xs text-text-faint">{item.priceTtc.toFixed(2)} ZMW each</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => onQtyChange(item.qty - 1)} className="w-6 h-6 rounded-md border border-input-border grid place-items-center text-text-muted hover:bg-surface-hover">
          <Minus size={12} />
        </button>
        <span className="w-6 text-center text-sm tabular-nums text-text!">{item.qty}</span>
        <button type="button" onClick={() => onQtyChange(item.qty + 1)} className="w-6 h-6 rounded-md border border-input-border grid place-items-center text-text-muted hover:bg-surface-hover">
          <Plus size={12} />
        </button>
      </div>
      <p className="w-16 text-right text-sm font-semibold text-text! tabular-nums shrink-0">{(item.priceTtc * item.qty).toFixed(2)}</p>
      <button type="button" onClick={onRemove} className="shrink-0 p-1 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// Real via takeposnew/waiter_order.php's real ordering flow — see
// waiterOrder.queries.ts for the full endpoint-by-endpoint evidence. This
// covers the core "build a cart, place the order" loop; payment/checkout,
// cash drawer, modifiers, barcode scanning and offline sync are separate,
// much larger real subsystems left out of this pass by explicit agreement.
export function WaiterOrderPage() {
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [transportMode, setTransportMode] = useState<0 | 1>(0)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [cart, setCart] = useState<Map<number, WaiterCartItem>>(new Map())
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const { data: tables, isLoading: tablesLoading } = useWaiterTables()
  const { data: categories } = useWaiterCategories()
  const { data: products, isLoading: productsLoading } = useWaiterProducts(categoryId, searchInput)
  const { data: existingOrder } = useWaiterTableInvoice(selectedTable)
  const placeOrder = usePlaceWaiterOrder()

  // Seed the local cart from whatever draft order already exists for the
  // selected table (e.g. reopening a table someone else started) — cleared
  // immediately on table switch (see selectTable) so it never shows a
  // flash of the previous table's items before the new table's real data
  // arrives.
  useEffect(() => {
    if (!existingOrder) return
    const seeded = new Map<number, WaiterCartItem>()
    existingOrder.lines.forEach((l) => {
      seeded.set(l.productId, { productId: l.productId, label: l.label, qty: l.qty, priceHt: l.priceHt, priceTtc: l.priceTtc, tvaTx: l.tvaTx, vatSrcCode: '' })
    })
    setCart(seeded)
  }, [existingOrder])

  function selectTable(id: number) {
    setSelectedTable(id)
    setCart(new Map())
    setBanner(null)
  }

  function addToCart(product: WaiterProduct) {
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(product.id)
      if (existing) next.set(product.id, { ...existing, qty: existing.qty + 1 })
      else next.set(product.id, { productId: product.id, label: product.label, qty: 1, priceHt: product.priceHt, priceTtc: product.priceTtc, tvaTx: product.tvaTx, vatSrcCode: product.vatSrcCode })
      return next
    })
  }

  function updateQty(productId: number, qty: number) {
    setCart((prev) => {
      const next = new Map(prev)
      if (qty <= 0) next.delete(productId)
      else {
        const existing = next.get(productId)
        if (existing) next.set(productId, { ...existing, qty })
      }
      return next
    })
  }

  function removeFromCart(productId: number) {
    setCart((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }

  const cartItems = useMemo(() => Array.from(cart.values()), [cart])
  const total = cartItems.reduce((sum, c) => sum + c.priceTtc * c.qty, 0)
  const selectedTableLabel = tables?.find((t) => t.id === selectedTable)?.label

  function handlePlaceOrder() {
    if (!selectedTable || cartItems.length === 0) return
    setBanner(null)
    placeOrder.mutate(
      { place: selectedTable, transportMode, cart: cartItems },
      {
        onSuccess: () => setBanner({ kind: 'success', message: `Order placed for ${selectedTableLabel ?? 'table'}.` }),
        onError: (err) => setBanner({ kind: 'error', message: err instanceof Error ? err.message : 'Could not place the order.' }),
      },
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text! shrink-0">
          <ShoppingCart size={20} className="text-brand" /> Create Orders
        </h2>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setTransportMode(0)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium ${transportMode === 0 ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
          >
            <UtensilsCrossed size={14} /> Dine In
          </button>
          <button
            type="button"
            onClick={() => setTransportMode(1)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium ${transportMode === 1 ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
          >
            <ShoppingBag size={14} /> TakeAway
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 px-6 py-4">
        {/* Left: table picker, category tabs, product grid */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 soft-scrollbar">
            <Table2 size={16} className="text-text-faint shrink-0" />
            {tablesLoading && <span className="text-xs text-text-faint">Loading tables…</span>}
            {tables?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTable(t.id)}
                title={t.occupied ? `Occupied${t.totalTtc ? ` — ${t.totalTtc.toFixed(2)} ZMW` : ''}` : 'Available'}
                className={`shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap ${
                  selectedTable === t.id
                    ? 'bg-brand text-white'
                    : t.occupied
                      ? 'bg-warning-bg text-warning-fg hover:opacity-80'
                      : 'border border-input-border text-text-muted hover:bg-surface-hover'
                }`}
              >
                <Table2 size={12} /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 soft-scrollbar">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold ${categoryId === null ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
            >
              All
            </button>
            {categories?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap ${
                  categoryId === c.id ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto soft-scrollbar">
            {productsLoading ? (
              <div className="flex items-center justify-center h-40 text-text-faint gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading products…
              </div>
            ) : !products || products.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-text-faint italic">No products found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: current order / cart */}
        <Card className="!p-0 w-80 shrink-0 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text!">Current Order</h3>
            <p className="text-xs text-text-faint">{selectedTableLabel ? selectedTableLabel : 'Select a table to start an order'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 soft-scrollbar">
            {!selectedTable ? (
              <p className="text-sm text-text-faint italic py-6 text-center">No table selected</p>
            ) : cartItems.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">Cart empty</p>
            ) : (
              cartItems.map((item) => (
                <CartRow key={item.productId} item={item} onQtyChange={(qty) => updateQty(item.productId, qty)} onRemove={() => removeFromCart(item.productId)} />
              ))
            )}
          </div>

          <div className="border-t border-border p-4 space-y-3">
            {banner && (
              <p className={`flex items-start gap-1.5 text-xs rounded-md px-2.5 py-2 ${banner.kind === 'success' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>
                {banner.kind === 'success' ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                {banner.message}
              </p>
            )}
            <div className="flex items-center justify-between text-sm font-semibold text-text!">
              <span>Total</span>
              <span className="tabular-nums">{total.toFixed(2)} ZMW</span>
            </div>
            <button
              type="button"
              disabled={!selectedTable || cartItems.length === 0 || placeOrder.isPending}
              onClick={handlePlaceOrder}
              className="w-full h-10 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placeOrder.isPending && <Loader2 size={14} className="animate-spin" />}
              Place Order
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
