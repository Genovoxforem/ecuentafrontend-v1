import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, X, Calendar, Search, Filter, FileText, Wallet, CheckCircle2, Hourglass, Receipt, Info, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
import { getReportsInRange, getPaymentSummary } from "../pos/features/reports/services/reportsApi";
import { exportReportExcel, exportReportPDF } from "../pos/features/reports/Components/ReportExport";
import useAuthStore from "../pos/stores/authStore";
import { formatAmount } from "../pos/utils/currency";
import { ROUTES } from "../routes";

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));
const RANGES = [
    { key: "today", label: "Today", from: () => iso(new Date()) },
    { key: "yesterday", label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
    { key: "7", label: "7 days", from: () => daysAgo(6) },
    { key: "30", label: "30 days", from: () => daysAgo(29) },
    { key: "all", label: "All", from: () => "2000-01-01" },
];

function Stat({ icon: Icon, label, value, tone }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span>
            <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-xl font-bold tabular-nums">{value}</p>
            </div>
        </div>
    );
}

// "Invoice history": POS invoices for a period with payment totals, search and Excel/PDF export.
// Data comes from the same reports API as V1's dialog; an unpaid invoice opens on its own page,
// where payments are collected.
export default function InvoiceHistoryV2({ onClose }) {
    const navigate = useNavigate();
    const terminal = useAuthStore((s) => s.terminalConfig?.terminalNumber) || 1;
    const [range, setRange] = useState("today");
    const [from, setFrom] = useState(iso(new Date()));
    const [to, setTo] = useState(iso(new Date()));
    const [query, setQuery] = useState("");
    const [state, setState] = useState({ loading: true, error: "", entries: [], totals: null, payments: null });

    const load = useCallback(async (f, t, q) => {
        setState((s) => ({ ...s, loading: true, error: "" }));
        try {
            const r = await getReportsInRange({ startDate: f, endDate: t, search: q });
            let payments = null;
            try { payments = await getPaymentSummary(r.entries); } catch { /* optional section */ }
            setState({ loading: false, error: "", entries: r.entries, totals: r.totals, payments });
        } catch (e) {
            setState({ loading: false, error: e.message || "Could not load invoices", entries: [], totals: null, payments: null });
        }
    }, []);

    useEffect(() => { load(from, to, ""); /* initial period only */ // eslint-disable-line react-hooks/exhaustive-deps
    }, []);

    const pick = (r) => {
        const f = r.from();
        const t = r.to ? r.to() : iso(new Date());
        setRange(r.key); setFrom(f); setTo(t);
        load(f, t, query);
    };

    const sums = useMemo(() => {
        const e = state.entries;
        return {
            count: e.length,
            sales: e.reduce((s, x) => s + x.total_ttc, 0),
            received: e.reduce((s, x) => s + x.received, 0),
            pending: e.reduce((s, x) => s + x.pending, 0),
        };
    }, [state.entries]);
    const exportArgs = { entries: state.entries, totals: state.totals, startIso: from, endIso: to, terminal, searchTerm: query };
    const label = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-500"><History size={20} /></span>
                    <div className="flex-1 leading-tight">
                        <p className="text-lg font-bold">Invoice history</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Today · {label}</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-slate-700"><X size={16} /></button>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 px-5 py-3 dark:border-slate-700">
                    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                        {RANGES.map((r) => (
                            <button key={r.key} type="button" onClick={() => pick(r)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${range === r.key ? "bg-white text-blue-600 shadow dark:bg-slate-700 dark:text-blue-300" : "text-slate-500"}`}>{r.label}</button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                        <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRange("custom"); }} className="bg-transparent outline-none" />
                        <span className="text-slate-500 dark:text-slate-400">–</span>
                        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRange("custom"); }} className="bg-transparent outline-none" />
                    </label>
                    <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <Search size={14} className="text-slate-500 dark:text-slate-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(from, to, query)} placeholder="Invoice no., customer or reference" className="min-w-0 flex-1 bg-transparent outline-none" />
                    </label>
                    <button type="button" onClick={() => load(from, to, query)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><Filter size={14} /> Apply</button>
                </div>

                <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span>Payments received</span>
                        <span className="normal-case">ZMW {formatAmount(state.payments?.total || 0)} · {state.payments?.totalCount || 0} payments</span>
                    </div>
                    <div className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
                        {state.payments?.payments?.length ? (
                            <div className="flex flex-wrap gap-x-6 gap-y-1">
                                {state.payments.payments.map((p) => (
                                    <span key={p.code || p.label}>{p.label}: <b>ZMW {formatAmount(p.amount)}</b> <span className="text-slate-500 dark:text-slate-400">({p.count})</span></span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-slate-500">No payments in this period.</span>
                        )}
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat icon={FileText} label="Invoices" value={sums.count} tone="bg-blue-500/15 text-blue-500" />
                        <Stat icon={Wallet} label="Sales" value={`ZMW ${formatAmount(sums.sales)}`} tone="bg-sky-500/15 text-sky-500" />
                        <Stat icon={CheckCircle2} label="Received" value={`ZMW ${formatAmount(sums.received)}`} tone="bg-emerald-500/15 text-emerald-500" />
                        <Stat icon={Hourglass} label="Outstanding" value={`ZMW ${formatAmount(sums.pending)}`} tone="bg-amber-500/15 text-amber-500" />
                    </div>

                    {state.loading ? (
                        <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading invoices…</p>
                    ) : state.error ? (
                        <p className="py-12 text-center text-sm text-red-500">{state.error}</p>
                    ) : state.entries.length === 0 ? (
                        <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                            <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600"><Receipt size={26} /></span>
                            <p className="font-semibold text-slate-600 dark:text-slate-300">No invoices in this period</p>
                            <p className="text-xs">Pick another date range or tap “All”.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                                        <th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Customer</th>
                                        <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Received</th><th className="px-3 py-2 text-right">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.entries.map((e) => (
                                        <tr key={e.id} onClick={() => { onClose(); navigate(ROUTES.invoiceDetail.replace(":id", String(e.id))); }} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                                            <td className="px-3 py-2 font-semibold text-blue-600">{e.ref}</td>
                                            <td className="px-3 py-2">{e.date}</td>
                                            <td className="px-3 py-2">{e.customer}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatAmount(e.total_ttc)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatAmount(e.received)}</td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${e.pending > 0 ? "font-bold text-amber-600" : ""}`}>{formatAmount(e.pending)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
                    <p className="mr-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Info size={13} className="text-blue-500" /> Tap an unpaid invoice to collect its payment</p>
                    <button type="button" disabled={!state.entries.length} onClick={() => exportReportExcel(exportArgs)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"><FileSpreadsheet size={15} className="text-emerald-500" /> Excel</button>
                    <button type="button" disabled={!state.entries.length} onClick={() => exportReportPDF(exportArgs)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"><FileDown size={15} className="text-red-500" /> PDF</button>
                    <button type="button" onClick={onClose} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Close</button>
                </div>
            </div>
        </div>
    );
}
