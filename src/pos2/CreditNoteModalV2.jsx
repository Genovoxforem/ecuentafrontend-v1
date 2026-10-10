import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2, X, Search, Loader2 } from "lucide-react";
import { getReportsInRange } from "../pos/features/reports/services/reportsApi";
import { formatAmount } from "../pos/utils/currency";
import { ROUTES } from "../routes";

const iso = (d) => d.toISOString().slice(0, 10);

// "Credit Note - Select Invoice": lists recent POS invoices; the credit note itself is created on the
// invoice's own page (its verified "Create Credit Note" action), so nothing is written from here.
export default function CreditNoteModalV2({ onClose }) {
    const navigate = useNavigate();
    const [rows, setRows] = useState(null);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");

    useEffect(() => {
        const end = new Date();
        const start = new Date(end.getTime() - 90 * 86400000);
        getReportsInRange({ startDate: iso(start), endDate: iso(end) })
            .then((r) => setRows(r.entries))
            .catch((e) => setError(e.message || "Could not load invoices"));
    }, []);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = (rows || []).filter((r) => !q || `${r.ref} ${r.customer}`.toLowerCase().includes(q));
        return list.slice(0, 100);
    }, [rows, query]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-slate-900 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-red-600 px-5 py-4">
                    <p className="flex items-center gap-2 text-lg font-bold">
                        <Undo2 size={18} /> Credit Note - Select Invoice
                    </p>
                    <button type="button" onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-4 pb-2">
                    <div className="flex items-center overflow-hidden rounded-md border border-slate-600">
                        <span className="grid h-10 w-10 place-items-center bg-slate-700"><Search size={15} /></span>
                        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice ref or customer..." className="h-10 min-w-0 flex-1 bg-slate-800 px-3 text-sm outline-none" />
                    </div>
                </div>
                <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    {error && <p className="py-6 text-center text-sm text-red-400">{error}</p>}
                    {!rows && !error && <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading invoices…</p>}
                    {rows && shown.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No invoices found.</p>}
                    {shown.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                                onClose();
                                navigate(ROUTES.invoiceDetail.replace(":id", String(r.id)));
                            }}
                            className="flex w-full items-center justify-between border-b border-slate-700 py-3 text-left hover:bg-slate-800"
                        >
                            <span className="text-sm">
                                <b>{r.ref}</b> <span className="ml-1 text-xs text-slate-400">{r.customer}</span>
                            </span>
                            <span className="text-right text-xs">
                                <span className="block text-slate-400">{r.date}</span>
                                <span className="block text-base font-bold">{formatAmount(r.total_ttc)}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
