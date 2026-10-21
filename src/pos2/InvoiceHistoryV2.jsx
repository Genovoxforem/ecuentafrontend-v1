import { useCallback, useEffect, useMemo, useState } from "react";
import { History, X, Calendar, CheckCircle, AlertTriangle, Search, Filter, FileText, Wallet, CheckCircle2, Hourglass, Receipt, Info, FileSpreadsheet, FileDown, Loader2, Printer, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ChevronsUpDown, CreditCard, Banknote, SlidersHorizontal, ShoppingCart } from "lucide-react";
import { getReportsInRange, getPaymentSummary } from "../pos/features/reports/services/reportsApi";
import { fetchReceipt } from "../pos/features/reports/services/receiptApi";
import { printReceipt } from "../pos/features/reports/Components/InvoiceReceipt";
import { exportReportExcel, exportReportPDF } from "../pos/features/reports/Components/ReportExport";
import usePosStore from "../pos/features/pos/stores/posStore";
import useAuthStore from "../pos/stores/authStore";
import { formatAmount } from "../pos/utils/currency";
import { PRIMARY_BTN } from "./buttonStyles";

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));
const RANGES = [
    { key: "today", label: "Today", from: () => iso(new Date()) },
    { key: "yesterday", label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
    { key: "7", label: "7 days", from: () => daysAgo(6) },
    { key: "30", label: "30 days", from: () => daysAgo(29) },
    { key: "all", label: "All", from: () => "2000-01-01" },
];

// "MM/DD/YYYY" (what the reports API returns) -> sortable timestamp.
const dateValue = (d) => {
    const [m, day, y] = String(d || "").split("/");
    const t = new Date(Number(y), Number(m) - 1, Number(day)).getTime();
    return Number.isNaN(t) ? 0 : t;
};
// Like V1: an invoice with nothing received shows "Not Specified" (the method field can be a customer default).
const paymentOf = (e) => (e.received === 0 ? "Not Specified" : e.paymentType);
const isCash = (label) => /cash/i.test(String(label));
const INPUT_TXT = "text-slate-900 placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400";

function PaymentPill({ label }) {
    return <span className="whitespace-nowrap rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">{label}</span>;
}

function StatusBadge({ status, entry }) {
    // The backend calls a closed, fully paid invoice "Classified Paid"; the cashier just needs "Paid".
    let s = String(status || "—").replace("Classified Paid", "Paid");
    if (/unpaid/i.test(s) && entry?.received > 0) s = "Partially paid";
    const tone = /abandon/i.test(s) ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : /unpaid|partially/i.test(s) ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : /paid/i.test(s) ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300";
    return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone}`}>{s.replace("Validated (Unpaid)", "Unpaid")}</span>;
}

const COLUMNS = [
    { key: "date", label: "Date", value: (e) => dateValue(e.date), cell: (e) => e.date },
    { key: "ref", label: "Invoice", value: (e) => e.ref, cell: (e) => <span className="font-bold text-blue-600 underline underline-offset-2 dark:text-blue-300">{e.ref}</span> },
    { key: "customer", label: "Customer", value: (e) => e.customer, cell: (e) => e.customer },
    { key: "payment", label: "Payment", value: paymentOf, cell: (e) => <PaymentPill label={paymentOf(e)} /> },
    { key: "total_ht", label: "Excl. Tax", num: true, value: (e) => e.total_ht, cell: (e) => formatAmount(e.total_ht) },
    { key: "total_tva", label: "VAT", num: true, value: (e) => e.total_tva, cell: (e) => formatAmount(e.total_tva) },
    { key: "total_ttc", label: "Total", num: true, bold: true, value: (e) => e.total_ttc, cell: (e) => formatAmount(e.total_ttc) },
    { key: "pending", label: "Pending", num: true, value: (e) => e.pending, cell: (e) => <span className={e.pending > 0 ? "font-bold text-amber-600" : ""}>{formatAmount(e.pending)}</span> },
    { key: "change", label: "Change", num: true, value: (e) => e.change, cell: (e) => formatAmount(e.change) },
    { key: "received", label: "Received", num: true, value: (e) => e.received, cell: (e) => formatAmount(e.received) },
    { key: "author", label: "Author", value: (e) => e.author, cell: (e) => e.author },
    { key: "currency", label: "Currency", value: (e) => e.currency, cell: (e) => e.currency },
    { key: "status", label: "Status", value: (e) => e.status || "", cell: (e) => <StatusBadge status={e.status} entry={e} /> },
];
const SUM_KEYS = ["total_ht", "total_tva", "total_ttc", "pending", "change", "received"];
const PAGE_SIZES = [10, 25, 50, 100, "All"];

function Stat({ icon: Icon, label, value, tone }) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/60">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={16} /></span>
            <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-sm font-bold tabular-nums">{value}</p>
            </div>
        </div>
    );
}

// "Invoice History": a fixed, large dialog so the table gets the most room. Top: filters, payment totals per method
// (click one to filter the table) and summary tiles. Below: a sortable, filterable, paged table (same columns as POS V1's
// reports) that scrolls inside the dialog with a sticky header and totals row. Each row has a print button, and an
// unpaid row also has a button that loads the invoice into the cart to collect its payment.
export default function InvoiceHistoryV2({ onClose }) {
    const terminal = useAuthStore((s) => s.terminalConfig?.terminalNumber) || 1;
    const loadInvoiceIntoCart = usePosStore((s) => s.loadInvoiceIntoCart);
    const showToast = usePosStore((s) => s.showToast);
    const [range, setRange] = useState("today");
    const [from, setFrom] = useState(iso(new Date()));
    const [to, setTo] = useState(iso(new Date()));
    const [query, setQuery] = useState("");
    const [state, setState] = useState({ loading: true, error: "", entries: [], totals: null, payments: null });
    const [filter, setFilter] = useState("");
    const [payFilter, setPayFilter] = useState(null);
    const [sort, setSort] = useState({ key: "date", dir: "desc" });
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [hidden, setHidden] = useState(() => new Set());
    const [colsOpen, setColsOpen] = useState(false);
    const [busyId, setBusyId] = useState(null);
    // Clicking an invoice with nothing left to collect shows what it is instead of doing nothing (like POS V1).
    const [notice, setNotice] = useState(null);
    useEffect(() => {
        if (!notice) return undefined;
        const t = setTimeout(() => setNotice(null), 10000);
        return () => clearTimeout(t);
    }, [notice]);

    const load = useCallback(async (f, t, q) => {
        setState((s) => ({ ...s, loading: true, error: "" }));
        try {
            const r = await getReportsInRange({ startDate: f, endDate: t, search: q });
            if (!r) throw new Error("Could not load invoices from the server.");
            // Drafts never completed a sale — leave them out, as POS V1 does.
            const entries = r.entries.filter((e) => e.status !== "Draft" && !String(e.ref).startsWith("(PROV"));
            let payments = null;
            try { payments = await getPaymentSummary(entries); } catch { /* optional section */ }
            setState({ loading: false, error: "", entries, totals: r.totals, payments });
            setPage(1);
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

    const visibleCols = COLUMNS.filter((c) => !hidden.has(c.key));
    const rows = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[0];
        const list = state.entries.filter((e) => {
            if (payFilter && paymentOf(e).toLowerCase() !== payFilter.toLowerCase()) return false;
            return !q || [e.ref, e.customer, e.status, e.author, paymentOf(e), e.date].some((v) => String(v ?? "").toLowerCase().includes(q));
        });
        return [...list].sort((a, b) => {
            const x = col.value(a), y = col.value(b);
            const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
            return sort.dir === "asc" ? r : -r;
        });
    }, [state.entries, filter, sort, payFilter]);
    const firstSum = visibleCols.findIndex((c) => SUM_KEYS.includes(c.key));
    const columnTotals = useMemo(() => Object.fromEntries(SUM_KEYS.map((k) => [k, rows.reduce((s, e) => s + (Number(e[k]) || 0), 0)])), [rows]);

    const size = pageSize === "All" ? Math.max(1, rows.length) : pageSize;
    const totalPages = Math.max(1, Math.ceil(rows.length / size));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * size, safePage * size);
    const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * size + 1;
    const rangeEnd = Math.min(safePage * size, rows.length);
    useEffect(() => setPage(1), [filter, pageSize, payFilter]);

    const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" ? "desc" : "asc" }));
    const toggleCol = (key) => setHidden((h) => { const n = new Set(h); if (n.has(key)) n.delete(key); else n.add(key); return n; });
    const resetTable = () => { setFilter(""); setPayFilter(null); setSort({ key: "date", dir: "desc" }); setPageSize(25); setHidden(new Set()); };

    const settleable = (e) => e.status !== "Abandoned" && e.pending > 0;
    const settle = async (e) => {
        if (busyId) return;
        if (!settleable(e)) {
            showToast(e.status === "Abandoned" ? "This invoice has been abandoned and can't be loaded into the cart." : "This invoice has no remaining balance — nothing to settle.", "warning");
            return;
        }
        setBusyId(e.id);
        try {
            const r = await fetchReceipt(e.id);
            const items = (r.lines || []).map((l) => ({
                id: l.product_id,
                name: l.product_label || l.description || "Item",
                ref: l.product_ref || "",
                price: l.qty > 0 ? l.total_ttc / l.qty : l.price_unit,
                qty: l.qty,
            }));
            loadInvoiceIntoCart({ id: e.id, ref: e.ref, remainToPay: e.pending, items });
            showToast(`Invoice ${e.ref} loaded into cart — ZMW ${e.pending.toFixed(2)} due`);
            onClose();
        } catch (err) {
            showToast(err.message || "Failed to load invoice into cart", "error");
        } finally {
            setBusyId(null);
        }
    };
    const print = async (e) => {
        if (busyId) return;
        setBusyId(e.id);
        try {
            const r = await fetchReceipt(e.id);
            if (!printReceipt(r)) showToast("Allow pop-ups to print the receipt.", "warning");
        } catch (err) {
            showToast(err.message || "Failed to load receipt", "error");
        } finally {
            setBusyId(null);
        }
    };

    const exportArgs = { entries: rows, totals: state.totals, startIso: from, endIso: to, terminal, searchTerm: query };
    const label = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const payTotal = state.payments?.total || 0;
    const pageBtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-200 px-2 text-sm font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800";
    const iconBtn = "grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800";
    const exportBtn = "flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800";
    const stickyHead = "sticky top-0 z-10 bg-slate-50 dark:bg-[#13233b]";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
            <div className="flex h-[92vh] w-[96vw] max-w-[110rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#0b1626] dark:text-white" onClick={(e) => { e.stopPropagation(); setColsOpen(false); }}>
                <div className="flex shrink-0 items-center gap-3 px-4 py-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/15 text-blue-500"><History size={18} /></span>
                    <div className="flex-1 leading-tight">
                        <p className="text-base font-bold">Invoice History</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Today - {label}</p>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"><X size={15} /></button>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 border-y border-slate-200 px-4 py-1.5 dark:border-slate-700">
                    <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/80">
                        {RANGES.map((r) => (
                            <button key={r.key} type="button" onClick={() => pick(r)} className={`rounded-md px-3 py-1 text-xs font-bold transition ${range === r.key ? PRIMARY_BTN : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{r.label}</button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700">
                        <Calendar size={13} className="text-slate-500 dark:text-slate-300" />
                        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRange("custom"); }} className={`bg-transparent font-medium outline-none ${INPUT_TXT}`} />
                        <span className="text-slate-500 dark:text-slate-400">-</span>
                        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRange("custom"); }} className={`bg-transparent font-medium outline-none ${INPUT_TXT}`} />
                    </label>
                    <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700">
                        <Search size={13} className="shrink-0 text-slate-500 dark:text-slate-300" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(from, to, query)} placeholder="Invoice no., customer or reference..." className={`min-w-0 flex-1 bg-transparent font-medium outline-none ${INPUT_TXT}`} />
                    </label>
                    <button type="button" onClick={() => load(from, to, query)} className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold ${PRIMARY_BTN}`}><Filter size={13} /> Apply</button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-2">
                    <div className="shrink-0">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Payments received</span>
                            <span className="text-xs normal-case">ZMW {formatAmount(payTotal)} - {state.payments?.totalCount || 0} payments</span>
                        </div>
                        <div className="flex flex-wrap items-stretch gap-2">
                            {state.payments?.payments?.length ? (
                                state.payments.payments.map((p) => {
                                    const pct = payTotal > 0 ? Math.round((p.amount / payTotal) * 100) : 0;
                                    const cash = isCash(p.label);
                                    const active = payFilter?.toLowerCase() === String(p.label).toLowerCase();
                                    return (
                                        <button
                                            key={p.code || p.label}
                                            type="button"
                                            aria-pressed={active}
                                            title={active ? "Show all payment methods" : `Show only ${p.label} invoices`}
                                            onClick={() => setPayFilter(active ? null : p.label)}
                                            className={`relative min-w-[12rem] overflow-hidden rounded-xl border bg-white px-3 pb-3 pt-1.5 text-left transition hover:border-blue-400 dark:bg-slate-900/60 ${active ? "border-blue-500 ring-1 ring-blue-500/40" : "border-slate-200 dark:border-slate-700"}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cash ? "bg-emerald-500/15 text-emerald-500" : "bg-blue-500/15 text-blue-500"}`}>{cash ? <Banknote size={16} /> : <CreditCard size={16} />}</span>
                                                <div className="leading-tight">
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.label} · {p.count} payments · {pct}%</p>
                                                    <p className="text-sm font-bold tabular-nums">ZMW {formatAmount(p.amount)}</p>
                                                </div>
                                            </div>
                                            <i className={`absolute inset-x-3 bottom-1.5 h-1 overflow-hidden rounded-full ${cash ? "bg-emerald-500/20" : "bg-blue-500/20"}`}><i className={`block h-full rounded-full ${cash ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.max(pct, 2)}%` }} /></i>
                                        </button>
                                    );
                                })
                            ) : (
                                <span className="grid min-w-[12rem] place-items-center rounded-xl bg-slate-100 px-3 text-xs text-slate-500 dark:bg-slate-800">No payments in this period.</span>
                            )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                            <Stat icon={FileText} label="Invoices" value={sums.count} tone="bg-blue-500/15 text-blue-500" />
                            <Stat icon={Wallet} label="Sales" value={`ZMW ${formatAmount(sums.sales)}`} tone="bg-sky-500/15 text-sky-500" />
                            <Stat icon={CheckCircle2} label="Received" value={`ZMW ${formatAmount(sums.received)}`} tone="bg-emerald-500/15 text-emerald-500" />
                            <Stat icon={Hourglass} label="Outstanding" value={`ZMW ${formatAmount(sums.pending)}`} tone="bg-blue-500/15 text-blue-400" />
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 dark:border-slate-700">
                        {state.loading ? (
                            <p className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading invoices…</p>
                        ) : state.error ? (
                            <p className="flex flex-1 items-center justify-center py-12 text-sm text-red-500">{state.error}</p>
                        ) : state.entries.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                                <span className="mb-3 grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600"><Receipt size={24} /></span>
                                <p className="font-semibold text-slate-600 dark:text-slate-300">No invoices in this period</p>
                                <p className="text-xs">Pick another date range or tap “All”.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 p-2 dark:border-slate-700">
                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                        <button type="button" aria-label="Show or hide columns" title="Columns" onClick={() => setColsOpen((o) => !o)} className={iconBtn}><List size={16} /></button>
                                        {colsOpen && (
                                            <div className="absolute left-0 top-10 z-30 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                                                {COLUMNS.map((c) => (
                                                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                                                        <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <select value={pageSize} onChange={(e) => setPageSize(e.target.value === "All" ? "All" : Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-sm font-medium text-slate-900 dark:border-slate-600 dark:bg-[#0b1626] dark:text-slate-100">
                                        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                    <label className="flex h-9 w-full min-w-[12rem] max-w-xs items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-600">
                                        <Search size={15} className="shrink-0 text-slate-500 dark:text-slate-300" />
                                        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter these results..." className={`min-w-0 flex-1 bg-transparent font-medium outline-none ${INPUT_TXT}`} />
                                    </label>
                                    <div className="ml-auto flex items-center gap-2">
                                        <button type="button" disabled={!rows.length} onClick={() => exportReportExcel(exportArgs)} className={exportBtn}><FileSpreadsheet size={16} className="text-emerald-500" /> Excel</button>
                                        <button type="button" disabled={!rows.length} onClick={() => exportReportPDF(exportArgs)} className={exportBtn}><FileDown size={16} className="text-red-500" /> PDF</button>
                                        <button type="button" aria-label="Reset filters, sorting and columns" title="Reset filters, sorting and columns" onClick={resetTable} className={iconBtn}><SlidersHorizontal size={16} /></button>
                                    </div>
                                </div>
                                <div className="soft-scrollbar min-h-0 flex-1 overflow-auto">
                                    <table className="w-full whitespace-nowrap text-sm">
                                        <thead>
                                            <tr className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                <th className={`${stickyHead} w-10 px-2 py-2 text-center font-bold`}>#</th>
                                                {visibleCols.map((c) => (
                                                    <th key={c.key} className={`${stickyHead} px-2.5 py-2 ${c.num ? "text-right" : "text-left"}`}>
                                                        <button type="button" onClick={() => toggleSort(c.key)} className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider hover:text-slate-900 dark:hover:text-white ${sort.key === c.key ? "text-blue-600 dark:text-blue-300" : ""}`}>
                                                            {c.label}
                                                            {sort.key === c.key ? (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="opacity-50" />}
                                                        </button>
                                                    </th>
                                                ))}
                                                <th className={`${stickyHead} px-2.5 py-2 text-center font-bold`}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageRows.length === 0 ? (
                                                <tr><td colSpan={visibleCols.length + 2} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">No invoices match the current filters.</td></tr>
                                            ) : (
                                                pageRows.map((e, idx) => (
                                                    <tr key={e.id} onClick={() => (settleable(e) ? settle(e) : setNotice(e))} title={settleable(e) ? "Click to load this invoice into the cart" : "Click for details"} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
                                                        <td className="px-2 py-1 text-center text-slate-500 dark:text-slate-400">{rangeStart + idx}</td>
                                                        {visibleCols.map((c) => (
                                                            <td key={c.key} className={`px-2.5 py-1 ${c.num ? "text-right tabular-nums" : ""} ${c.bold ? "font-bold" : ""}`}>{c.cell(e)}</td>
                                                        ))}
                                                        <td className="px-2.5 py-0.5">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button type="button" aria-label={`Print receipt ${e.ref}`} title="Print receipt" onClick={(ev) => { ev.stopPropagation(); print(e); }} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                                                                    {busyId === e.id ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                                                                </button>
                                                                {settleable(e) && (
                                                                    <button type="button" aria-label={`Collect payment for ${e.ref}`} title="Collect payment" onClick={(ev) => { ev.stopPropagation(); settle(e); }} className={`grid h-8 w-8 place-items-center rounded-lg ${PRIMARY_BTN}`}>
                                                                        <ShoppingCart size={15} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {rows.length > 0 && (
                                            <tfoot>
                                                <tr className="font-bold">
                                                    <td className="sticky bottom-0 border-t-2 border-slate-200 bg-white dark:border-slate-600 dark:bg-[#0b1626]" />
                                                    {visibleCols.map((c, i) => (
                                                        <td key={c.key} className={`sticky bottom-0 border-t-2 border-slate-200 bg-white px-2.5 py-2 dark:border-slate-600 dark:bg-[#0b1626] ${c.num || i === firstSum - 1 ? "text-right tabular-nums" : ""}`}>
                                                            {SUM_KEYS.includes(c.key) ? formatAmount(columnTotals[c.key]) : i === firstSum - 1 ? "Total" : ""}
                                                        </td>
                                                    ))}
                                                    <td className="sticky bottom-0 border-t-2 border-slate-200 bg-white dark:border-slate-600 dark:bg-[#0b1626]" />
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                                    <span className="text-slate-600 dark:text-slate-300">{rangeStart}-{rangeEnd} of {rows.length} invoices</span>
                                    <div className="flex items-center gap-1.5">
                                        <button type="button" aria-label="First page" disabled={safePage <= 1} onClick={() => setPage(1)} className={pageBtn}><ChevronsLeft size={15} /></button>
                                        <button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className={pageBtn}><ChevronLeft size={15} /></button>
                                        <span className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-bold ${PRIMARY_BTN}`}>{safePage}</span>
                                        <button type="button" aria-label="Next page" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className={pageBtn}><ChevronRight size={15} /></button>
                                        <button type="button" aria-label="Last page" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} className={pageBtn}><ChevronsRight size={15} /></button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-4 py-1.5 dark:border-slate-700">
                    <p className="mr-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-white"><Info size={13} /></span> Tap an unpaid invoice to collect its payment
                    </p>
                    <button type="button" onClick={onClose} className={`flex items-center gap-2 rounded-lg px-5 py-1.5 text-sm font-bold ${PRIMARY_BTN}`}><X size={15} /> Close</button>
                </div>
            </div>

            {notice && (
                <div role="status" className={`fixed right-4 top-4 z-[90] w-80 rounded-xl p-4 text-white shadow-2xl ${notice.status === "Abandoned" ? "bg-amber-600" : "bg-emerald-500"}`} onClick={(e) => e.stopPropagation()}>
                    <p className="flex items-center gap-2 text-sm font-bold">
                        {notice.status === "Abandoned" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                        {notice.status === "Abandoned" ? "Invoice Abandoned" : "Invoice Already Paid"}
                    </p>
                    <p className="mt-2 text-sm">
                        {notice.status === "Abandoned" ? `Invoice ${notice.ref} has been abandoned and can't be paid.` : `Invoice ${notice.ref} has been fully paid (ZMW ${Number(notice.total_ttc).toFixed(2)}).`}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => print(notice)} disabled={busyId === notice.id} className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                            {busyId === notice.id ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Reprint
                        </button>
                        <button type="button" onClick={() => setNotice(null)} className="rounded-md bg-white/25 px-3 py-1 text-xs font-bold hover:bg-white/35">Dismiss</button>
                    </div>
                </div>
            )}
        </div>
    );
}
