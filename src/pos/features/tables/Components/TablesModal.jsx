import { useEffect, useState } from "react";
import { Check, Grid3x3, Loader2, X } from "lucide-react";
import { fetchFloorPlan } from "../services/tables.data";
import { useTableSelection } from "../hooks/useTableSelection";
import { STATUS_META } from "../statusMeta";
import useTableStore from "../stores/tableStore";

// The restaurant floors and their tables from takepos/fapi/tables.php: a table is Occupied while it has an open (unpaid) POS invoice,
// otherwise Available. Those are the only two states the backend knows, so those are the only two shown (the old Reserved / Billing /
// Disabled / Maintenance states and the "Edit table statuses" mode had no backend, and saving always failed).
function TablesModal({ open, onClose }) {
    const [plan, setPlan] = useState({ floors: [], tables: [] });
    const [floor, setFloor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const selectedTable = useTableStore((state) => state.selectedTable);
    const { select, resumingId, error: selectError } = useTableSelection();

    useEffect(() => {
        if (!open) return undefined;
        let stale = false;
        setLoading(true);
        setError("");
        fetchFloorPlan()
            .then((data) => {
                if (stale) return;
                setPlan(data);
                setFloor(data.floors[0]?.floor ?? null);
                setLoading(false);
            })
            .catch((err) => {
                if (stale) return;
                setError(err.message || "Failed to load tables");
                setPlan({ floors: [], tables: [] });
                setLoading(false);
            });
        return () => {
            stale = true;
        };
    }, [open]);

    if (!open) return null;

    const shown = plan.tables.filter((table) => String(table.floor) === String(floor));
    const occupiedCount = shown.filter((table) => table.occupied).length;

    const handleSelectTable = async (table) => {
        if (await select(table)) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
                <div className="shrink-0 flex items-center justify-between px-6 py-2.5 bg-[#2f6fe4] text-white">
                    <div className="flex items-center gap-2.5 text-lg font-semibold">
                        <Grid3x3 size={20} />
                        Tables
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-6 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                    {plan.floors.map((f) => (
                        <button
                            key={f.floor}
                            type="button"
                            onClick={() => setFloor(f.floor)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                                floor === f.floor
                                    ? "bg-[#2f6fe4] text-white shadow-sm"
                                    : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600"
                            }`}
                        >
                            Floor {f.floor} ({f.tables})
                        </button>
                    ))}
                </div>

                <div className="flex-1 min-h-[220px] overflow-y-auto soft-scrollbar p-6">
                    {loading ? (
                        <div className="grid grid-cols-7 gap-3">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{error}</p>
                        </div>
                    ) : plan.tables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No tables are set up.</p>
                        </div>
                    ) : (
                        <>
                            {selectError && (
                                <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{selectError}</p>
                            )}

                            <div className="flex items-center gap-4 mb-4 px-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META.available.badge}`} />
                                    {STATUS_META.available.label} ({shown.length - occupiedCount})
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META.occupied.badge}`} />
                                    {STATUS_META.occupied.label} ({occupiedCount})
                                </span>
                            </div>

                            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 p-4">
                                <div className="grid grid-cols-7 gap-3">
                                    {shown.map((table) => {
                                        const meta = table.occupied ? STATUS_META.occupied : STATUS_META.available;
                                        const StatusIcon = meta.icon;
                                        const isSelected = selectedTable?.id === table.id;
                                        const isResuming = resumingId === table.id;

                                        return (
                                            <button
                                                key={table.id}
                                                type="button"
                                                disabled={!!resumingId}
                                                onClick={() => handleSelectTable(table)}
                                                title={table.occupied && table.invoiceRef ? `${table.label} — open order ${table.invoiceRef}` : table.label}
                                                className={`relative flex flex-col items-center justify-center gap-1.5 aspect-square rounded-2xl bg-white dark:bg-slate-800 border-[3px] shadow-md transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl ${meta.border} ${meta.glow} ${
                                                    isSelected ? "ring-2 ring-[#2f6fe4] ring-offset-2 ring-offset-blue-50 dark:ring-offset-slate-900" : ""
                                                } ${resumingId && !isResuming ? "opacity-50" : ""}`}
                                            >
                                                {isResuming ? (
                                                    <Loader2 size={16} className="animate-spin text-gray-500 dark:text-slate-400" />
                                                ) : isSelected ? (
                                                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#2f6fe4] text-white">
                                                        <Check size={13} />
                                                    </span>
                                                ) : StatusIcon ? (
                                                    <StatusIcon size={16} className="text-gray-500 dark:text-slate-400" />
                                                ) : null}
                                                <span className="font-bold uppercase tracking-wide text-xs text-gray-800 dark:text-slate-100">
                                                    {table.label}
                                                </span>
                                                <span className={`text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white ${meta.badge}`}>
                                                    {meta.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TablesModal;
