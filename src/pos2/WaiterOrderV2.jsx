import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ConciergeBell, Armchair, Utensils, Wine, LayoutGrid, Tag, Search, Minus, Plus, Trash2, ShoppingBag, Home, X, Check, HelpCircle, ChevronDown, Monitor, BookOpen, RefreshCw, Moon, Power } from "lucide-react";
import "../pos/index.css";
import usePosStore from "../pos/features/pos/stores/posStore";
import useTableStore from "../pos/features/tables/stores/tableStore";
import useAuthStore from "../pos/stores/authStore";
import { useCategories } from "../pos/features/categories/hooks/useCategories";
import { useProducts } from "../pos/features/products/hooks/useProducts";
import { useTables } from "../pos/features/tables/hooks/useTables";
import { usePayment } from "../pos/features/payment/hooks/usePayment";
import { usePosSession } from "../pos/hooks/usePosSession";
import { fetchReceipt } from "../pos/features/reports/services/receiptApi";
import CartToast from "../pos/features/pos/Components/CartToast";
import TableChooserV2 from "./TableChooserV2";
import { ProductCard } from "./PosV2";
import { ROUTES } from "../routes";
import SyncConfirm from "./SyncConfirm";
import { refreshCache } from "../pos/services/posCache";
import { useAuth } from "../features/auth/AuthContext";
import { formatAmount } from "../pos/utils/currency";

// Waiter order screen (?place=<table id>): pick products for one table, then "Place Order" saves the
// cart as a draft invoice on that table, exactly like Hold on the POS (usePayment.saveDraft).
export default function WaiterOrderV2() {
    usePosSession();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const placeId = params.get("place");
    const terminal = useAuthStore((s) => s.terminalConfig?.terminalNumber) || 1;
    const cart = usePosStore((s) => s.cart);
    const addToCart = usePosStore((s) => s.addToCart);
    const changeQty = usePosStore((s) => s.changeQty);
    const removeFromCart = usePosStore((s) => s.removeFromCart);
    const loadInvoiceIntoCart = usePosStore((s) => s.loadInvoiceIntoCart);
    const clearCart = usePosStore((s) => s.clearCart);
    const showToast = usePosStore((s) => s.showToast);
    const selectedTable = useTableStore((s) => s.selectedTable);
    const selectTable = useTableStore((s) => s.selectTable);
    const { tables } = useTables();
    const { saveDraft, savingDraft, draftInvoice } = usePayment();
    const { categories } = useCategories();
    const { products: allProducts, loading } = useProducts({ search: "" });
    const [parentId, setParentId] = useState(null);
    const [query, setQuery] = useState("");
    const [tablesOpen, setTablesOpen] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [visible, setVisible] = useState(40);
    const [dark, setDark] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [syncAsk, setSyncAsk] = useState(false);
    const queryClient = useQueryClient();
    const { logout: mainLogout } = useAuth();
    const sync = async () => {
        try {
            await refreshCache();
            await queryClient.invalidateQueries({ queryKey: ["products"] });
            await queryClient.invalidateQueries({ queryKey: ["categories"] });
            showToast("Products and customers synced");
        } catch {
            showToast("Sync failed — check the connection", "error");
        }
    };

    // Select the table named in the URL once the table list is in (loading its open order if it has one).
    useEffect(() => {
        if (!placeId || !tables.length || String(selectedTable?.id) === String(placeId)) return;
        const t = tables.find((x) => String(x.id) === String(placeId));
        if (!t) return;
        (async () => {
            clearCart();
            if (t.occupied && t.invoiceId) {
                try {
                    const r = await fetchReceipt(t.invoiceId);
                    const items = (r.lines || []).map((l) => ({
                        id: l.product_id,
                        name: l.product_label || l.description || "Item",
                        ref: l.product_ref || "",
                        price: l.qty > 0 ? l.total_ttc / l.qty : l.price_unit,
                        qty: l.qty,
                    }));
                    const paid = (r.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
                    if (items.length) loadInvoiceIntoCart({ id: t.invoiceId, ref: r.invoice_ref, remainToPay: Math.max(0, (Number(r.total_ttc) || 0) - paid), items });
                } catch {
                    /* the table still opens, just without its previous lines */
                }
            }
            selectTable(t);
        })();
    }, [placeId, tables, selectedTable, clearCart, loadInvoiceIntoCart, selectTable]);

    const tops = useMemo(() => categories.filter((c) => !c.fk_parent), [categories]);
    const labelById = useMemo(() => new Map(categories.map((c) => [String(c.id), c.label])), [categories]);
    const idsFor = useMemo(() => {
        if (parentId === null) return null;
        const out = new Set([String(parentId)]);
        let grew = true;
        while (grew) {
            grew = false;
            for (const c of categories) if (out.has(String(c.fk_parent)) && !out.has(String(c.id))) { out.add(String(c.id)); grew = true; }
        }
        return out;
    }, [parentId, categories]);
    const products = useMemo(() => {
        const q = query.trim().toLowerCase();
        return allProducts.filter((p) => (!idsFor || idsFor.has(String(p.categoryId))) && (!q || [p.name, p.ref, p.barcode].some((v) => String(v ?? "").toLowerCase().includes(q))));
    }, [allProducts, idsFor, query]);
    useEffect(() => setVisible(40), [parentId, query]);

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const place = async () => {
        setConfirm(false);
        await saveDraft();
    };

    const navBtn = (active) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`;

    return (
        <div style={{ background: dark ? "#0f172a" : "#f8fafc" }} className={`pos-app pos-v2-root flex h-screen overflow-hidden ${dark ? "dark bg-slate-900 text-white" : "pos-light bg-slate-50 text-slate-900"}`} onClick={() => menuOpen && setMenuOpen(false)}>
            <aside className="flex w-[236px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="px-4 pb-2 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Waiter</p>
                    <p className="text-lg font-bold">Navigate</p>
                </div>
                <div className="space-y-1 px-2">
                    <button type="button" className={navBtn(true)}><ConciergeBell size={16} /> New order</button>
                    <button type="button" onClick={() => setTablesOpen(true)} className={navBtn(false)}><Armchair size={16} /> Tables</button>
                    <button type="button" onClick={() => navigate(ROUTES.kitchenDashboard)} className={navBtn(false)}><Utensils size={16} /> KOT orders</button>
                    <button type="button" onClick={() => navigate(ROUTES.kitchenBeverageOrders)} className={navBtn(false)}><Wine size={16} /> Bar orders</button>
                </div>
                <div className="px-4 pb-2 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Browse</p>
                    <p className="text-lg font-bold">Categories</p>
                </div>
                <nav className="soft-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
                    {[{ id: null, label: "All" }, ...tops].map((c) => (
                        <button key={c.id ?? "all"} type="button" onClick={() => setParentId(c.id)} className={navBtn(c.id === parentId)}>
                            {c.id === null ? <LayoutGrid size={16} /> : <Tag size={16} />} <span className="truncate uppercase">{c.label}</span>
                        </button>
                    ))}
                </nav>
                <button type="button" onClick={() => navigate(ROUTES.posV2)} className="m-3 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"><Home size={15} /> Back to POS</button>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold">E</span>
                    <div className="leading-tight">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taste of India</p>
                        <p className="text-base font-bold">Waiter Order</p>
                    </div>
                    <div className="flex max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3">
                        <Search size={16} className="text-slate-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    </div>
                    <div className="relative ml-auto" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title="Terminal menu" onClick={() => setMenuOpen((o) => !o)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-3 text-sm font-semibold hover:border-blue-500">
                            <i className="h-2 w-2 rounded-full bg-emerald-500" /> Terminal {terminal} <ChevronDown size={14} className="text-slate-400" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-12 z-40 w-72 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                                <p className="px-3 py-2 text-xs text-slate-400">Terminal {terminal} · Waiter</p>
                                {[
                                    [Home, "Home", () => navigate(ROUTES.home)],
                                    [Monitor, "POS screen", () => navigate(ROUTES.posV2)],
                                    [BookOpen, "Public menu", () => window.open(ROUTES.posPublicMenu, "_blank")],
                                    [RefreshCw, "Sync products & customers", () => setSyncAsk(true)],
                                ].map(([I, label, fn]) => (
                                    <button key={label} type="button" onClick={() => { setMenuOpen(false); fn(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"><I size={15} className="text-slate-400" /> {label}</button>
                                ))}
                                <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
                                <button type="button" onClick={() => { setMenuOpen(false); setDark((d) => !d); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"><Moon size={15} className="text-slate-400" /> Light / dark theme</button>
                                <button type="button" onClick={() => { mainLogout(); navigate(ROUTES.login); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-slate-700"><Power size={15} /> Sign out</button>
                            </div>
                        )}
                    </div>
                </header>
                <div className="flex min-h-0 flex-1">
                    <section className="soft-scrollbar min-w-0 flex-1 overflow-y-auto p-4">
                        <p className="mb-3 text-xl font-bold">New order {selectedTable && <span className="ml-2 text-sm font-normal text-slate-400">Table {selectedTable.label}</span>}</p>
                        {loading ? (
                            <p className="py-16 text-center text-sm text-slate-400">Loading products…</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                                    {products.slice(0, visible).map((p) => (
                                        <ProductCard key={p.id} product={p} categoryLabel={labelById.get(String(p.categoryId))} onAdd={(prod) => addToCart(prod)} />
                                    ))}
                                </div>
                                {products.length > visible && (
                                    <div className="py-4 text-center">
                                        <button type="button" onClick={() => setVisible((v) => v + 40)} className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800">Load more · {products.length - visible} left</button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    <div className="shrink-0 p-2 pl-0">
                        <div className="flex h-full w-[380px] flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-bold">Current order</p>
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">{draftInvoice ? "Draft saved" : "Draft"}</span>
                            </div>
                            <div className="mt-3 flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                                <span className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-200 dark:bg-slate-700 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300"><Utensils size={14} /> Dine in</span>
                                <span className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-400"><ShoppingBag size={14} /> TakeAway</span>
                            </div>
                            <button type="button" onClick={() => setTablesOpen(true)} className="mt-3 flex w-24 flex-col rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-left hover:border-blue-500">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Table</span>
                                <span className="text-sm font-semibold">{selectedTable ? selectedTable.label : "Select"}</span>
                            </button>
                            <div className="soft-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                                {cart.length === 0 ? (
                                    <p className="py-10 text-center text-sm text-slate-400">Tap a product to add it to this table’s order.</p>
                                ) : (
                                    cart.map((i) => (
                                        <div key={i.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                            <div className="flex justify-between gap-2 text-sm">
                                                <span className="min-w-0 truncate font-semibold">{i.name}</span>
                                                <span className="shrink-0 font-bold tabular-nums">{formatAmount(i.price * i.qty)} ZMW</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                {i.locked ? (
                                                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Pending · {i.qty}</span>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={() => changeQty(i.id, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 dark:border-slate-600"><Minus size={14} /></button>
                                                        <span className="w-8 text-center font-bold">{i.qty}</span>
                                                        <button type="button" onClick={() => changeQty(i.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 dark:border-slate-600"><Plus size={14} /></button>
                                                        <button type="button" aria-label="Remove item" onClick={() => removeFromCart(i.id)} className="ml-auto text-red-400"><Trash2 size={15} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                                <span className="text-sm font-bold">Total</span>
                                <span className="text-2xl font-bold tabular-nums">{formatAmount(total)} ZMW</span>
                            </div>
                            <button
                                type="button"
                                disabled={cart.length === 0 || !selectedTable || savingDraft || !!draftInvoice}
                                onClick={() => setConfirm(true)}
                                title={!selectedTable ? "Select a table first" : undefined}
                                className="mt-3 rounded-xl bg-blue-600 py-3 text-base font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                            >
                                {savingDraft ? "Placing…" : draftInvoice ? "Order placed" : "Place Order"}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {tablesOpen && (
                <TableChooserV2
                    onClose={() => setTablesOpen(false)}
                    onPick={(t) => {
                        setTablesOpen(false);
                        setParams({ place: String(t.id) });
                    }}
                />
            )}

            {confirm && (
                <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" onClick={() => setConfirm(false)}>
                    <div className="w-full max-w-md overflow-hidden rounded-xl bg-white text-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <p className="flex items-center gap-2 text-lg font-bold"><HelpCircle size={18} /> Create Order</p>
                            <button type="button" onClick={() => setConfirm(false)}><X size={18} /></button>
                        </div>
                        <p className="px-5 py-4 text-sm">Create this order as draft?</p>
                        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
                            <button type="button" onClick={() => setConfirm(false)} className="flex items-center gap-1.5 rounded-md bg-slate-500 px-4 py-2 text-sm font-semibold text-white"><X size={14} /> Cancel</button>
                            <button type="button" onClick={place} className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Check size={14} /> Submit</button>
                        </div>
                    </div>
                </div>
            )}
            <SyncConfirm open={syncAsk} onNo={() => setSyncAsk(false)} onYes={() => { setSyncAsk(false); sync(); }} />
            <CartToast />
        </div>
    );
}
