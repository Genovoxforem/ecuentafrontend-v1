import { useState } from "react";
import { Receipt, Trash2, Lock, XCircle, Save, Pencil, Utensils, ShoppingBag, ChevronDown } from "lucide-react";
import CustomerPickerV2 from "./CustomerPickerV2";
import TableChooserV2 from "./TableChooserV2";
import EditCartItemModal from "../pos/features/cart/Components/EditCartItemModal";
import PaymentModal from "../pos/features/payment/PaymentModal";
import ConfirmDialog from "../pos/components/ConfirmDialog";
import useAuthStore from "../pos/stores/authStore";
import usePosStore from "../pos/features/pos/stores/posStore";
import useTableStore from "../pos/features/tables/stores/tableStore";
import { usePayment } from "../pos/features/payment/hooks/usePayment";
import { computeCartTotals } from "../pos/features/payment/services/paymentService";
import { formatCurrency, formatAmount } from "../pos/utils/currency";

function Row({ label, value }) {
    return (
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>{label}</span>
            <span className="tabular-nums text-slate-700 dark:text-slate-200">{value}</span>
        </div>
    );
}

export default function CartPanelV2({ cart, onRemove, total, cashSessionOpen = true }) {
    const terminalNumber = useAuthStore((s) => s.terminalConfig?.terminalNumber) || 1;
    const updateCartItem = usePosStore((s) => s.updateCartItem);
    const pendingInvoice = usePosStore((s) => s.pendingInvoice);
    const cancelPendingInvoice = usePosStore((s) => s.cancelPendingInvoice);
    const showToast = usePosStore((s) => s.showToast);
    const checkoutBlockedReason = usePosStore((s) => s.checkoutBlockedReason);
    const orderType = useTableStore((s) => s.orderType);
    const setOrderType = useTableStore((s) => s.setOrderType);
    const selectedTable = useTableStore((s) => s.selectedTable);
    const { saveDraft, savingDraft, draftInvoice } = usePayment();
    const [editingItem, setEditingItem] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [tablesOpen, setTablesOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);
    const { subtotalExcl, tax } = computeCartTotals(cart);
    const ref = pendingInvoice?.ref || draftInvoice?.ref || `(PROV-POS${terminalNumber}-0)`;
    const status = pendingInvoice ? "Pending" : draftInvoice ? "Draft saved" : "Draft";

    const seg = (active) =>
        `flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
            active ? "bg-white text-blue-700 shadow dark:bg-slate-700 dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
        }`;

    return (
        <div className="flex h-full w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
                <p className="text-lg font-bold">Current order</p>
                <p className="flex items-center gap-2 text-xs text-slate-400">
                    {ref}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{status}</span>
                </p>
            </div>

            <div className={`mt-3 shrink-0 space-y-2 ${!cashSessionOpen ? "pointer-events-none opacity-50" : ""}`}>
                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    <button type="button" onClick={() => setOrderType("table")} className={seg(orderType === "table")}>
                        <Utensils size={14} /> Dine in
                    </button>
                    <button type="button" onClick={() => setOrderType("pickup")} className={seg(orderType === "pickup")}>
                        <ShoppingBag size={14} /> Takeaway
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTablesOpen(true)}
                        className="flex w-24 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 px-2 py-1.5 text-left hover:border-blue-500 dark:border-slate-700"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Table</span>
                        <span className="flex max-w-full items-center gap-1 truncate text-sm font-semibold">
                            {selectedTable ? selectedTable.label : "Select"} <ChevronDown size={13} className="shrink-0 text-slate-400" />
                        </span>
                    </button>
                    <div className="min-w-0 flex-1">
                        <CustomerPickerV2 />
                    </div>
                </div>
            </div>

            {pendingInvoice && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <div className="min-w-0 text-xs">
                        <p className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                            <Lock size={11} /> Pending Payment — {pendingInvoice.ref}
                        </p>
                        <p className="text-amber-600/80">Items locked · {formatCurrency(pendingInvoice.remainToPay)} due</p>
                    </div>
                    <button type="button" onClick={() => setConfirmCancelOpen(true)} className="flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                        <XCircle size={12} /> Cancel
                    </button>
                </div>
            )}

            <div className="soft-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
                {cart.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                        <span className="mb-3 grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600">
                            <Receipt size={26} />
                        </span>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cart is empty</p>
                        <p className="text-xs">Tap a product or scan a barcode to start</p>
                        <button
                            type="button"
                            onClick={() => document.querySelector('input[placeholder^="Search products"]')?.focus()}
                            className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-500 dark:border-slate-700 dark:text-slate-300"
                        >
                            Browse Products
                        </button>

                    </div>
                ) : (
                    <ul className="space-y-2">
                        {cart.map((item) => (
                            <li
                                key={item.id}
                                onClick={() => !item.locked && setEditingItem(item)}
                                className={`rounded-xl border px-3 py-2 ${item.locked ? "border-amber-200 bg-amber-50 text-slate-900" : "cursor-pointer border-slate-200 hover:border-blue-500 dark:border-slate-700"}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 truncate text-sm font-semibold" title={item.name}>
                                        {item.name}
                                    </p>
                                    <p className="shrink-0 text-sm font-bold tabular-nums">ZMW {formatAmount(item.price * item.qty)}</p>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        {formatCurrency(item.price)} × {item.qty}
                                        {!item.locked && <Pencil size={10} />}
                                        {item.locked && (
                                            <span className="inline-flex items-center gap-0.5 text-amber-700">
                                                <Lock size={10} /> Locked
                                            </span>
                                        )}
                                    </span>
                                    {!item.locked && (
                                        <button
                                            type="button"
                                            aria-label="Remove item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(item.id);
                                            }}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-3 shrink-0 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">
                <Row label="Items" value={itemCount} />
                <Row label="Subtotal (excl. tax)" value={`ZMW ${formatAmount(subtotalExcl)}`} />
                <Row label="Total tax" value={`ZMW ${formatAmount(tax)}`} />
                <div className="flex items-baseline justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                    <span className="text-sm font-bold">Total due</span>
                    <span className="text-3xl font-bold tabular-nums">
                        <span className="mr-1 text-xs font-medium text-slate-400">ZMW</span>
                        {formatAmount(total)}
                    </span>
                </div>
            </div>

            <div className="mt-3 flex shrink-0 items-center gap-2">
                {!pendingInvoice && (
                    <button
                        type="button"
                        disabled={cart.length === 0 || !cashSessionOpen || savingDraft || !!draftInvoice}
                        onClick={saveDraft}
                        title={draftInvoice ? `Draft saved — ${draftInvoice.ref}` : "Hold this sale as a draft"}
                        className="flex w-28 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        <Save size={15} /> {savingDraft ? "Saving…" : draftInvoice ? "Held" : "Hold"}
                    </button>
                )}
                <button
                    type="button"
                    disabled={cart.length === 0 || !cashSessionOpen || !!checkoutBlockedReason}
                    onClick={() => setPaymentOpen(true)}
                    title={checkoutBlockedReason ? `Checkout unavailable: ${checkoutBlockedReason}` : undefined}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-800"
                >
                    {pendingInvoice ? "Settle Invoice" : "Make Payment"}
                </button>
            </div>

            {tablesOpen && <TableChooserV2 onClose={() => setTablesOpen(false)} />}
            <EditCartItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={updateCartItem} onRemove={onRemove} />
            <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} />
            <ConfirmDialog
                open={confirmCancelOpen}
                title="Cancel pending payment and start a new sale?"
                message="This will clear the current cart and reset the payment state."
                confirmLabel="Cancel Payment"
                cancelLabel="Keep Cart"
                onCancel={() => setConfirmCancelOpen(false)}
                onConfirm={() => {
                    cancelPendingInvoice();
                    setConfirmCancelOpen(false);
                    showToast("Pending payment canceled. Ready for new sale.");
                }}
            />
        </div>
    );
}
