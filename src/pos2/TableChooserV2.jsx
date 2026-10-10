import { useMemo, useState } from "react";
import { Utensils, X, Loader2, ShoppingBag, Lock, LayoutGrid, List, Layers } from "lucide-react";
import { useTables } from "../pos/features/tables/hooks/useTables";
import useTableStore from "../pos/features/tables/stores/tableStore";
import usePosStore from "../pos/features/pos/stores/posStore";
import { fetchReceipt } from "../pos/features/reports/services/receiptApi";

const STATUS = {
    reserved: { label: "Reserved", cls: "bg-amber-500 text-white" },
    occupied: { label: "Occupied", cls: "bg-amber-100 text-amber-800" },
    current: { label: "Current", cls: "bg-blue-500 text-white" },
    available: { label: "Available", cls: "bg-emerald-100 text-emerald-800" },
};

// "Choose a dining table": same table data, order resume and selection logic as V1's selector, with the
// status counts, floor filters, grid/list switch and pickup shortcut of the new design. `onPick` lets a
// caller (the waiter screen) take the chosen table instead of the default select-and-resume behaviour.
export default function TableChooserV2({ onClose, onPick }) {
    const { tables, loading } = useTables();
    const selectedTable = useTableStore((s) => s.selectedTable);
    const selectTable = useTableStore((s) => s.selectTable);
    const clearTable = useTableStore((s) => s.clearTable);
    const setOrderType = useTableStore((s) => s.setOrderType);
    const loadInvoiceIntoCart = usePosStore((s) => s.loadInvoiceIntoCart);
    const clearCart = usePosStore((s) => s.clearCart);
    const showToast = usePosStore((s) => s.showToast);
    const [floor, setFloor] = useState("all");
    const [view, setView] = useState("grid");
    const [resumingId, setResumingId] = useState(null);
    const [error, setError] = useState("");

    const floors = useMemo(() => [...new Set(tables.map((t) => t.floor).filter(Boolean))], [tables]);
    const statusOf = (t) => (selectedTable?.id === t.id ? "current" : t.occupied ? (t.itemCount > 0 ? "reserved" : "occupied") : "available");
    const counts = useMemo(() => {
        const c = { available: 0, occupied: 0, current: 0 };
        for (const t of tables) {
            const s = selectedTable?.id === t.id ? "current" : t.occupied ? "occupied" : "available";
            c[s] += 1;
        }
        return c;
    }, [tables, selectedTable]);
    const shown = floor === "all" ? tables : tables.filter((t) => String(t.floor) === String(floor));

    const handleSelect = async (table) => {
        if (resumingId) return;
        if (onPick) {
            onPick(table);
            return;
        }
        setError("");
        let loaded = false;
        if (table.occupied && table.invoiceId) {
            setResumingId(table.id);
            try {
                const receipt = await fetchReceipt(table.invoiceId);
                const items = (receipt.lines || []).map((line) => ({
                    id: line.product_id,
                    name: line.product_label || line.description || "Item",
                    ref: line.product_ref || "",
                    price: line.qty > 0 ? line.total_ttc / line.qty : line.price_unit,
                    qty: line.qty,
                }));
                if (items.length > 0) {
                    const paid = (receipt.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    loadInvoiceIntoCart({ id: table.invoiceId, ref: receipt.invoice_ref, remainToPay: Math.max(0, (Number(receipt.total_ttc) || 0) - paid), items });
                    showToast(`${table.label}'s order loaded — ${items.length} item${items.length === 1 ? "" : "s"}`);
                    loaded = true;
                }
            } catch (err) {
                setError(err.message || "Failed to load this table's order");
                setResumingId(null);
                return;
            }
            setResumingId(null);
        }
        if (!loaded) {
            clearCart();
            showToast(`${table.label} selected — ready for a new order`);
        }
        selectTable(table);
        onClose();
    };

    const pickup = () => {
        clearTable();
        setOrderType("pickup");
        onClose();
    };

    const pill = (active) => `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "border border-slate-700 text-slate-300 hover:border-blue-500"}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 px-6 py-5">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/40"><Utensils size={26} /></span>
                    <div className="flex-1">
                        <p className="text-xl font-bold">Choose a dining table</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select an available table or open its current order</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700 hover:bg-slate-800"><X size={18} /></button>
                </div>

                <div className="flex flex-wrap items-center gap-5 px-6 pb-3 text-sm text-slate-300">
                    <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Available ({counts.available})</span>
                    <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Occupied ({counts.occupied})</span>
                    <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Current ({counts.current})</span>
                    {!onPick && (
                        <button type="button" onClick={pickup} className="ml-auto flex items-center gap-2 rounded-xl border border-blue-500/60 px-4 py-2 font-semibold hover:bg-slate-800">
                            <ShoppingBag size={15} /> Continue as Pickup
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
                    <button type="button" className={pill(floor === "all")} onClick={() => setFloor("all")}><Layers size={15} /> All Tables ({tables.length})</button>
                    {floors.map((f) => (
                        <button key={f} type="button" className={pill(String(floor) === String(f))} onClick={() => setFloor(f)}>
                            Floor {f} ({tables.filter((t) => String(t.floor) === String(f)).length})
                        </button>
                    ))}
                    <div className="ml-auto flex gap-1.5">
                        <button type="button" onClick={() => setView("grid")} className={`grid h-10 w-10 place-items-center rounded-xl border ${view === "grid" ? "border-blue-500 bg-blue-600" : "border-slate-700"}`}><LayoutGrid size={16} /></button>
                        <button type="button" onClick={() => setView("list")} className={`grid h-10 w-10 place-items-center rounded-xl border ${view === "list" ? "border-blue-500 bg-blue-600" : "border-slate-700"}`}><List size={16} /></button>
                    </div>
                </div>

                <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                    {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                    {loading ? (
                        <div className="grid grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-slate-800" />)}
                        </div>
                    ) : (
                        <div className={view === "grid" ? "grid grid-cols-2 gap-4 sm:grid-cols-4" : "space-y-2"}>
                            {shown.map((table) => {
                                const st = statusOf(table);
                                const meta = STATUS[st];
                                const busy = resumingId === table.id;
                                const ring = st === "current" ? "border-blue-500 bg-blue-500/10" : st === "reserved" ? "border-amber-500 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.25)]" : st === "occupied" ? "border-slate-700 bg-slate-800" : "border-slate-700 bg-slate-800/60 hover:border-blue-500";
                                return (
                                    <button
                                        key={table.id}
                                        type="button"
                                        disabled={!!resumingId}
                                        onClick={() => handleSelect(table)}
                                        className={`relative rounded-2xl border-2 transition hover:-translate-y-0.5 ${ring} ${view === "grid" ? "flex flex-col items-center gap-1 px-2 pb-4 pt-8" : "flex w-full items-center gap-4 px-4 py-3"} ${resumingId && !busy ? "opacity-50" : ""}`}
                                    >
                                        <span className={`${view === "grid" ? "absolute left-1/2 top-2 -translate-x-1/2" : ""} flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>
                                            {(st === "reserved" || st === "occupied") && <Lock size={10} />} {meta.label}
                                        </span>
                                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-700/60 text-blue-300">
                                            {busy ? <Loader2 size={22} className="animate-spin" /> : <Utensils size={22} />}
                                        </span>
                                        <span className={view === "grid" ? "text-center" : "flex-1 text-left"}>
                                            <span className="block text-lg font-bold">{table.label}</span>
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">Floor {table.floor ?? "-"}</span>
                                        </span>
                                        {table.occupied && table.itemCount > 0 && (
                                            <span className="flex flex-col items-center gap-1">
                                                <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[11px] font-bold">{table.itemCount} Items</span>
                                                <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[11px] font-bold">{table.itemCount} Ordered</span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
