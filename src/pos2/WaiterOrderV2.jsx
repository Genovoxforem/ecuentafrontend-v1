import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ConciergeBell, Armchair, Utensils, Wine, LayoutGrid, Tag, Search, Minus, Plus, Trash2, ShoppingBag, Home, X, Check, HelpCircle, ChevronDown, Monitor, BookOpen, RefreshCw, Moon, Power, ShoppingCart, ChevronLeft, ChevronRight, User, Image as ImageIcon } from "lucide-react";
import "../pos/index.css";
import usePosStore from "../pos/features/pos/stores/posStore";
import useTableStore from "../pos/features/tables/stores/tableStore";
import useAuthStore from "../pos/stores/authStore";
import { useCategories } from "../pos/features/categories/hooks/useCategories";
import { useProducts } from "../pos/features/products/hooks/useProducts";
import { useTables } from "../pos/features/tables/hooks/useTables";
import { usePayment } from "../pos/features/payment/hooks/usePayment";
import { PRIMARY_BTN } from "./buttonStyles";
import { useCompanyName } from "./company";
import ProductTile from "./ProductTile";
import { usePosSession } from "../pos/hooks/usePosSession";
import { fetchReceipt } from "../pos/features/reports/services/receiptApi";
import CartToast from "../pos/features/pos/Components/CartToast";
import TableChooserV2 from "./TableChooserV2";
import { ROUTES } from "../routes";
import SyncConfirm from "./SyncConfirm";
import { refreshCache } from "../pos/services/posCache";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { formatAmount } from "../pos/utils/currency";

// Waiter order screen (?place=<table id>): pick products for one table, then "Place Order" saves the
// cart as a draft invoice on that table, exactly like Hold on the POS (usePayment.saveDraft).
export default function WaiterOrderV2() {
    usePosSession();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const placeId = params.get("place");
    const terminal = useAuthStore((s) => s.terminalConfig?.terminalNumber) || 1;
    const companyName = useCompanyName();
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
    const [page, setPage] = useState(1);
    const { theme: appTheme } = useTheme();
    // Follows the app theme (light app -> light screen); the menu toggle still overrides it until the app theme changes.
    const [dark, setDark] = useState(appTheme !== "light");
    useEffect(() => setDark(appTheme !== "light"), [appTheme]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [syncAsk, setSyncAsk] = useState(false);
    const queryClient = useQueryClient();
    const { logout: mainLogout, user } = useAuth();
    const orderType = useTableStore((s) => s.orderType);
    const setOrderType = useTableStore((s) => s.setOrderType);
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
    useEffect(() => setPage(1), [parentId, query]);
    const PAGE_SIZE = 24;
    const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageProducts = useMemo(() => products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [products, safePage]);
    const cartQtyById = useMemo(() => new Map(cart.map((i) => [i.id, i.qty])), [cart]);
    const imageById = useMemo(() => new Map(allProducts.filter((p) => p.image).map((p) => [p.id, p.image])), [allProducts]);
    const itemCount = cart.reduce((s, i) => s + i.qty, 0);
    const needsTable = orderType === "table" && !selectedTable;
    const placeBlocked = cart.length === 0 || needsTable || savingDraft || !!draftInvoice;

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const place = async () => {
        setConfirm(false);
        await saveDraft();
    };

    const navBtn = (active) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`;

    return (
        <div style={{ background: dark ? "#0f172a" : "#eef2f7" }} className={`pos-app pos-v2-root flex h-screen overflow-hidden ${dark ? "dark bg-slate-900 text-white" : "pos-light bg-slate-100 text-slate-900"}`} onClick={() => menuOpen && setMenuOpen(false)}>
            <aside className="flex w-[236px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="px-4 pb-2 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Waiter</p>
                    <p className="text-lg font-bold">Navigate</p>
                </div>
                <div className="space-y-1 px-2">
                    <button type="button" className={navBtn(true)}><ConciergeBell size={16} /> New order</button>
                    <button type="button" onClick={() => setTablesOpen(true)} className={navBtn(false)}><Armchair size={16} /> Tables</button>
                    <button type="button" onClick={() => navigate(ROUTES.kitchenDashboard)} className={navBtn(false)}><Utensils size={16} /> KOT orders</button>
                    <button type="button" onClick={() => navigate(ROUTES.kitchenBeverageOrders)} className={navBtn(false)}><Wine size={16} /> Bar orders</button>
                </div>
                <div className="px-4 pb-2 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Browse</p>
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
                <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold">E</span>
                    <div className="leading-tight">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{companyName}</p>
                        <p className="text-base font-bold">Waiter Order</p>
                    </div>
                    <div className="flex max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3">
                        <Search size={16} className="text-slate-500 dark:text-slate-400" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    </div>
                    <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="hidden items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 md:flex" title="Signed in">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-100 text-blue-700"><User size={14} /></span>
                        <span className="leading-tight">
                            <span className="block text-[13px] font-bold">{user?.login || "User"}</span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">{user?.admin ? "Administrator" : "Waiter"}</span>
                        </span>
                    </span>
                    <button type="button" onClick={() => setSyncAsk(true)} className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${PRIMARY_BTN}`}><RefreshCw size={15} /> Sync</button>
                    <div className="relative">
                        <button type="button" title="Terminal menu" onClick={() => setMenuOpen((o) => !o)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-3 text-sm font-semibold hover:border-blue-500">
                            <i className="h-2 w-2 rounded-full bg-emerald-500" /> Terminal {terminal} <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-12 z-40 w-72 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                                <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Terminal {terminal} · Waiter</p>
                                {[
                                    [Home, "Home", () => navigate(ROUTES.home)],
                                    [Monitor, "POS screen", () => navigate(ROUTES.posV2)],
                                    [BookOpen, "Public menu", () => window.open(ROUTES.posPublicMenu, "_blank")],
                                    [RefreshCw, "Sync products & customers", () => setSyncAsk(true)],
                                ].map(([I, label, fn]) => (
                                    <button key={label} type="button" onClick={() => { setMenuOpen(false); fn(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"><I size={15} className="text-slate-500 dark:text-slate-400" /> {label}</button>
                                ))}
                                <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
                                <button type="button" onClick={() => { setMenuOpen(false); setDark((d) => !d); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"><Moon size={15} className="text-slate-500 dark:text-slate-400" /> Light / dark theme</button>
                                <button type="button" onClick={() => { mainLogout(); navigate(ROUTES.login); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-slate-700"><Power size={15} /> Sign out</button>
                            </div>
                        )}
                    </div>
                    </div>
                </header>
                <div className="flex min-h-0 flex-1">
                    <section className="flex min-w-0 flex-1 flex-col">
                        <div className="flex shrink-0 flex-wrap items-center gap-2 px-2 pt-2">
                            <button type="button" onClick={() => setTablesOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold shadow-sm hover:border-blue-500 dark:border-slate-600 dark:bg-slate-800">
                                <Armchair size={15} className="text-blue-500" /> {selectedTable ? `Table ${selectedTable.label}` : "Select Table"}
                            </button>
                            <p className="text-xl font-bold">New order</p>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{products.length} items</span>
                            <div className="ml-auto flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                                {[["table", "Dine In", Utensils], ["pickup", "TakeAway", ShoppingBag]].map(([mode, label, I]) => (
                                    <button key={mode} type="button" onClick={() => setOrderType(mode)} className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${orderType === mode ? "bg-white text-blue-600 shadow dark:bg-slate-700 dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}>
                                        <I size={14} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                            {loading ? (
                                <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading products…</p>
                            ) : products.length === 0 ? (
                                <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No products found.</p>
                            ) : (
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                                    {pageProducts.map((p) => (
                                        <ProductTile key={p.id} product={p} categoryLabel={labelById.get(String(p.categoryId))} inCartQty={cartQtyById.get(p.id) || 0} onAdd={(prod) => addToCart(prod, 1)} onRemove={(prod) => changeQty(prod.id, -1)} />
                                    ))}
                                </div>
                            )}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-200 px-2 py-2 dark:border-slate-700">
                                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className={`flex items-center gap-1 rounded-lg px-4 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${PRIMARY_BTN}`}>
                                    <ChevronLeft size={15} /> Previous
                                </button>
                                <span className="text-sm font-semibold">Page {safePage} of {totalPages}</span>
                                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className={`flex items-center gap-1 rounded-lg px-4 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${PRIMARY_BTN}`}>
                                    Next <ChevronRight size={15} />
                                </button>
                            </div>
                        )}
                    </section>

                    <div className="shrink-0 py-2 pr-2">
                        <div className="flex h-full w-[380px] flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex items-center justify-between">
                                <p className="flex items-center gap-2 text-lg font-bold">
                                    Current order
                                    {itemCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{itemCount}</span>}
                                </p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-slate-800 dark:text-amber-400">{draftInvoice ? "Draft saved" : "Draft"}</span>
                            </div>
                            <div className="soft-scrollbar mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
                                {cart.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                                        <ShoppingCart size={34} strokeWidth={1.5} />
                                        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Cart empty</p>
                                        <p className="text-xs">Tap a product to add it to this order.</p>
                                    </div>
                                ) : (
                                    cart.map((i) => {
                                        const img = i.image || imageById.get(i.id);
                                        return (
                                            <div key={i.id} className="flex gap-2 rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                                                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-600">
                                                    <span className="absolute inset-0 grid place-items-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"><ImageIcon size={18} strokeWidth={1.5} /></span>
                                                    {img && <img src={img} alt="" loading="lazy" className="relative h-full w-full bg-white object-contain object-center p-1" onError={(e) => (e.currentTarget.style.display = "none")} />}
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col justify-between">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="min-w-0 truncate text-[12px] font-semibold" title={i.name}>{i.name}</span>
                                                        {!i.locked && (
                                                            <button type="button" aria-label="Remove item" onClick={() => removeFromCart(i.id)} className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {i.locked ? (
                                                            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Pending · {i.qty}</span>
                                                        ) : (
                                                            <span className="flex items-center rounded-full border border-slate-200 dark:border-slate-600">
                                                                <button type="button" aria-label="Decrease quantity" onClick={() => changeQty(i.id, -1)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><Minus size={11} /></button>
                                                                <span className="min-w-[20px] text-center text-[12px] font-bold tabular-nums">{i.qty}</span>
                                                                <button type="button" aria-label="Increase quantity" onClick={() => changeQty(i.id, 1)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><Plus size={11} /></button>
                                                            </span>
                                                        )}
                                                        <span className="ml-1 truncate text-[10px] text-slate-500 dark:text-slate-400">× {formatAmount(i.price)}</span>
                                                        <span className="ml-auto shrink-0 text-[13px] font-bold tabular-nums">{formatAmount(i.price * i.qty)} ZMW</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                                <span className="text-sm font-bold">Total</span>
                                <span className="text-2xl font-bold tabular-nums">{formatAmount(total)} ZMW</span>
                            </div>
                            <button
                                type="button"
                                disabled={placeBlocked}
                                onClick={() => setConfirm(true)}
                                className={`mt-3 rounded-xl py-3 text-base font-bold shadow-lg shadow-blue-600/25 ${PRIMARY_BTN} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 dark:disabled:hover:bg-slate-800`}
                            >
                                {savingDraft ? "Placing…" : draftInvoice ? "Order placed" : "Place Order"}
                            </button>
                            {needsTable && cart.length > 0 && !draftInvoice && <p className="mt-1.5 text-center text-xs text-amber-600 dark:text-amber-400">Select a table to place this order.</p>}
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
