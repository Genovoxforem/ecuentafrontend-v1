import { Layers, X, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useSplitPayment } from "../pos/features/payment/hooks/useSplitPayment";
import { PAYMENT_METHODS } from "../pos/features/payment/Components/PaymentMethods";
import ReceiptOptions from "../pos/features/payment/Components/ReceiptOptions";
import { formatAmount } from "../pos/utils/currency";

// Split the bill across several payment methods. Uses the same split-payment logic as the classic POS
// (first payment creates the invoice, the rest are added to it); the sale is only completed when the
// amounts add up to the total.
export default function SplitPaymentV2({ onClose }) {
    const p = useSplitPayment();
    const done = !!p.completedReceipt;
    const balanced = Math.abs(p.remaining) <= 0.01;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="soft-scrollbar max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${done ? "bg-emerald-500/15 text-emerald-500" : "bg-blue-500/15 text-blue-500"}`}>
                        {done ? <CheckCircle2 size={18} /> : <Layers size={18} />}
                    </span>
                    <p className="flex-1 text-lg font-bold">{done ? "Payment Successful - Receipt" : "Split payment"}</p>
                    {!p.submitting && (
                        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-slate-700"><X size={16} /></button>
                    )}
                </div>

                {done ? (
                    <ReceiptOptions receipt={p.completedReceipt} onClose={onClose} onNewSale={onClose} />
                ) : (
                    <div className="p-5">
                        <div className="mb-4 flex items-baseline justify-between rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total due</span>
                            <span className="text-2xl font-bold tabular-nums">ZMW {formatAmount(p.total)}</span>
                        </div>

                        <div className="space-y-2">
                            {p.lines.map((line) => (
                                <div key={line.id} className="flex items-center gap-2">
                                    <select value={line.method} onChange={(e) => p.updateLine(line.id, { method: e.target.value })} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800">
                                        {PAYMENT_METHODS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
                                    </select>
                                    <input type="number" min="0" step="0.01" value={line.amount} onChange={(e) => p.updateLine(line.id, { amount: e.target.value })} placeholder="0.00" className="h-11 w-36 rounded-xl border border-slate-300 bg-white px-3 text-right text-sm tabular-nums outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" />
                                    <button type="button" aria-label="Remove payment line" onClick={() => p.removeLine(line.id)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-slate-800"><Trash2 size={15} /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={p.addLine} className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"><Plus size={14} /> Add payment</button>

                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                            <span className={`font-bold tabular-nums ${balanced ? "text-emerald-600" : "text-amber-600"}`}>ZMW {formatAmount(p.remaining)}</span>
                        </div>
                        {p.error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{p.error}</p>}

                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" disabled={p.submitting} onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800">Cancel</button>
                            <button type="button" disabled={p.submitting || !balanced} onClick={p.submitSplit} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {p.submitting && <Loader2 size={15} className="animate-spin" />} Complete payment
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
