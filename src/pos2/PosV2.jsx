import { lazy, Suspense, useMemo, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
    LayoutGrid, Tag, Search, ScanBarcode, Layers, Plus, Moon, Sun, LogOut, ChevronDown, Image as ImageIcon, X, Settings,
    Trash2, ArrowLeftRight, Home, FileText, Undo2, UtensilsCrossed, Monitor, RefreshCw, Power, ChevronRight, ConciergeBell,
} from "lucide-react";
import "../pos/index.css";
import usePosStore from "../pos/features/pos/stores/posStore";
import useAuthStore from "../pos/stores/authStore";
import { useCategories } from "../pos/features/categories/hooks/useCategories";
import { useProducts } from "../pos/features/products/hooks/useProducts";
import CartPanelV2 from "./CartPanelV2";
import CreditNoteModalV2 from "./CreditNoteModalV2";
import SyncConfirm from "./SyncConfirm";
import CartToast from "../pos/features/pos/Components/CartToast";
import { usePosSession } from "../pos/hooks/usePosSession";
import { refreshCache } from "../pos/services/posCache";
import { useAuth } from "../features/auth/AuthContext";
import { ROUTES } from "../routes";
import { formatAmount } from "../pos/utils/currency";

const CashDeskModal = lazy(() => import("../pos/features/cash/Components/CashDeskModal"));
const InvoiceHistory = lazy(() => import("./InvoiceHistoryV2"));

const PAGE_SIZE = 40;
const CHIP_LIMIT = 8;

function stockTone(stock) {
    if (stock === null || stock === undefined || stock === "") return null;
    const n = Number(stock);
    if (Number.isNaN(n)) return null;
    return { n, cls: n > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200" };
}

export function ProductCard({ product, onAdd, categoryLabel }) {
    const tone = stockTone(product.stock);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onAdd(product)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAdd(product)}
            className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
        >
            <div className="relative grid h-28 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-700">
                {product.image ? (
                    <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                    <ImageIcon size={36} />
                )}
                {tone && <span className={`absolute right-1.5 top-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}>{tone.n} in stock</span>}
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{categoryLabel || product.ref}</p>
            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800 dark:text-slate-100">{product.name}</p>
            <div className="mt-1 flex items-center justify-between">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                    {formatAmount(product.price)} <span className="text-[10px] font-medium text-slate-400">ZMW</span>
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-700">
                    <Plus size={16} />
                </span>
            </div>
        </div>
    );
}

function MenuItem({ icon: Icon, children, onClick, danger, disabled, chevron }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white ${
                danger ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : "hover:bg-slate-100 dark:hover:bg-slate-700/60"
            }`}
        >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${danger ? "border-red-500/30 bg-red-500/10 text-red-500" : "border-slate-200 text-slate-500 group-hover:border-blue-500 group-hover:text-blue-500 dark:border-slate-600"}`}>
                <Icon size={16} />
            </span>
            <span className="flex-1">{children}</span>
            {chevron !== false && <ChevronRight size={15} className="text-slate-400" />}
        </button>
    );
}

function PosV2() {
    usePosSession();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout: mainLogout, user } = useAuth();
    const terminalConfig = useAuthStore((s) => s.terminalConfig);
    const terminal = terminalConfig?.terminalNumber || 1;

    const cart = usePosStore((s) => s.cart);
    const sales = usePosStore((s) => s.sales);
    const searchTerm = usePosStore((s) => s.searchTerm);
    const setSearchTerm = usePosStore((s) => s.setSearchTerm);
    const addToCart = usePosStore((s) => s.addToCart);
    const removeFromCart = usePosStore((s) => s.removeFromCart);
    const createNewSale = usePosStore((s) => s.createNewSale);
    const cashSessionOpen = usePosStore((s) => s.cashSessionOpen);
    const activePlace = usePosStore((s) => s.activePlace);
    const cartsByPlace = usePosStore((s) => s.cartsByPlace);
    const customersByPlace = usePosStore((s) => s.customersByPlace);
    const draftInvoicesByPlace = usePosStore((s) => s.draftInvoicesByPlace);
    const switchSale = usePosStore((s) => s.switchSale);
    const deleteSale = usePosStore((s) => s.deleteSale);
    const showToast = usePosStore((s) => s.showToast);

    const [heldOpen, setHeldOpen] = useState(false);
    const [menu, setMenu] = useState(null);
    const [dark, setDark] = useState(true);
    const [parentId, setParentId] = useState(null);
    const [subId, setSubId] = useState(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [cashOpen, setCashOpen] = useState(false);
    const [reportsOpen, setReportsOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [creditOpen, setCreditOpen] = useState(false);
    const [syncAsk, setSyncAsk] = useState(false);
    const [heldQuery, setHeldQuery] = useState("");
    const searchRef = useRef(null);

    const { categories } = useCategories();
    const { products: allProducts, loading, error } = useProducts({ search: "" });

    // Category tree: top-level categories in the sidebar, their children as chips; counts roll up.
    const { tops, childrenOf, descendantIds, labelById } = useMemo(() => {
        const kids = new Map();
        for (const c of categories) {
            const k = String(c.fk_parent || 0);
            kids.set(k, [...(kids.get(k) || []), c]);
        }
        const desc = (id) => {
            const out = new Set([String(id)]);
            for (const c of kids.get(String(id)) || []) for (const d of desc(c.id)) out.add(d);
            return out;
        };
        return {
            tops: kids.get("0") || [],
            childrenOf: (id) => kids.get(String(id)) || [],
            descendantIds: (id) => desc(id),
            labelById: new Map(categories.map((c) => [String(c.id), c.label])),
        };
    }, [categories]);

    const countFor = useMemo(() => {
        const own = new Map();
        for (const p of allProducts) own.set(String(p.categoryId), (own.get(String(p.categoryId)) || 0) + 1);
        return (id) => {
            let n = 0;
            for (const d of descendantIds(id)) n += own.get(d) || 0;
            return n;
        };
    }, [allProducts, descendantIds]);

    const activeId = subId ?? parentId;
    const products = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const ids = activeId !== null ? descendantIds(activeId) : null;
        return allProducts.filter((p) => {
            if (ids && !ids.has(String(p.categoryId))) return false;
            if (!q) return true;
            return [p.name, p.ref, p.barcode].some((v) => String(v ?? "").toLowerCase().includes(q));
        });
    }, [allProducts, activeId, searchTerm, descendantIds]);

    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
    const heldCount = sales.filter((x) => x.place !== activePlace).length;
    const chips = parentId !== null ? childrenOf(parentId) : [];
    const heading = activeId !== null ? labelById.get(String(activeId)) : "All items";

    useEffect(() => setVisible(PAGE_SIZE), [activeId, searchTerm]);
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === "Escape") {
                setMenu(null);
                setHeldOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const pickParent = (id) => {
        setParentId(id);
        setSubId(null);
        setMoreOpen(false);
    };
    const clearFilter = () => pickParent(null);

    const logout = () => {
        mainLogout();
        navigate(ROUTES.login);
    };
    const sync = async () => {
        setMenu(null);
        setSyncing(true);
        try {
            await refreshCache();
            await queryClient.invalidateQueries({ queryKey: ["products"] });
            await queryClient.invalidateQueries({ queryKey: ["categories"] });
            showToast("Products and customers synced");
        } catch {
            showToast("Sync failed — check the connection", "error");
        } finally {
            setSyncing(false);
        }
    };
    const go = (to) => {
        setMenu(null);
        navigate(to);
    };

    const name = [user?.firstname, user?.lastname].filter(Boolean).join(" ") || user?.login || "User";
    const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div style={{ background: dark ? "#0f172a" : "#f8fafc" }} className={`pos-app pos-v2-root flex h-screen overflow-hidden ${dark ? "dark bg-slate-900 text-white" : "pos-light bg-slate-50 text-slate-900"}`} onClick={() => menu && setMenu(null)}>
            <aside className="flex w-[236px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="px-4 pb-3 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Browse</p>
                    <p className="text-lg font-bold">Categories</p>
                </div>
                <nav className="soft-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
                    {[{ id: null, label: "All items" }, ...tops].map((c) => {
                        const active = c.id === parentId;
                        return (
                            <button
                                key={c.id ?? "all"}
                                type="button"
                                onClick={() => pickParent(c.id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-semibold transition ${
                                    active ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                }`}
                            >
                                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-500 dark:border-slate-600"}`}>
                                    {c.id === null ? <LayoutGrid size={15} /> : <Tag size={15} />}
                                </span>
                                <span className="min-w-0 flex-1 truncate uppercase">{c.label}</span>
                                <span className="text-xs text-slate-400">{c.id === null ? allProducts.length : countFor(c.id)}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="flex items-center gap-3 border-t border-slate-200 p-3 dark:border-slate-700">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials}</span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-slate-400">Terminal T{terminal}</p>
                    </div>
                    <button type="button" onClick={logout} title="Log out" className="grid h-9 w-9 place-items-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50">
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white">E</span>
                        <div className="leading-tight">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taste of India</p>
                            <p className="text-base font-bold">Point of Sale</p>
                        </div>
                    </div>
                    <div className="flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-800">
                        <Search size={16} className="shrink-0 text-slate-400" />
                        <input
                            ref={searchRef}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search products or scan barcode"
                            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400 sm:block">Ctrl K</kbd>
                        <ScanBarcode size={18} className="text-blue-600" />
                    </div>
                    <button type="button" onClick={() => { setMenu(null); setHeldOpen(true); }} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold hover:border-blue-500 dark:border-slate-600 dark:bg-slate-800">
                        <Layers size={15} /> Held <span className="rounded-full bg-slate-100 px-1.5 text-xs dark:bg-slate-700">{heldCount}</span>
                    </button>
                    <div className="relative">
                        <button type="button" title="Terminal menu" onClick={() => setMenu((m) => (m === "terminal" ? null : "terminal"))} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold hover:border-blue-500 dark:border-slate-600 dark:bg-slate-800">
                            <span className={`h-2 w-2 rounded-full ${cashSessionOpen ? "bg-emerald-500" : "bg-red-500"}`} /> Terminal {terminal} <ChevronDown size={14} className="text-slate-400" />
                        </button>
                        {menu === "terminal" && (
                            <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                                <div className="flex items-center gap-3 border-b border-slate-200 px-2 pb-3 pt-1 dark:border-slate-600">
                                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-500"><Monitor size={20} /></span>
                                    <div className="flex-1 leading-tight">
                                        <p className="font-bold">Terminal {terminal}</p>
                                        <p className="text-xs text-slate-400">{name}</p>
                                    </div>
                                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${navigator.onLine ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
                                        <i className={`h-2 w-2 rounded-full ${navigator.onLine ? "bg-emerald-500" : "bg-red-500"}`} /> {navigator.onLine ? "Online" : "Offline"}
                                    </span>
                                </div>
                                <div className="space-y-0.5 pt-2">
                                    <MenuItem icon={FileText} onClick={() => { setMenu(null); setReportsOpen(true); }}>Invoice history &amp; reports</MenuItem>
                                    <MenuItem icon={Undo2} onClick={() => { setMenu(null); setCreditOpen(true); }}>Credit note</MenuItem>
                                    <MenuItem icon={UtensilsCrossed} onClick={() => go(ROUTES.posWaiter)}>Kitchen orders (KOT)</MenuItem>
                                    <MenuItem icon={Monitor} onClick={() => { setMenu(null); window.open(`${ROUTES.posCustomerDisplay}?place=${activePlace}&terminal=${terminal}`, "pos_customer_display", "width=1100,height=700"); }}>Customer display</MenuItem>
                                    <MenuItem icon={RefreshCw} onClick={() => { setMenu(null); setSyncAsk(true); }} disabled={syncing}>{syncing ? "Syncing…" : "Sync products & customers"}</MenuItem>
                                </div>
                                <div className="my-2 border-t border-slate-200 dark:border-slate-600" />
                                <MenuItem icon={Power} danger onClick={() => { setMenu(null); setCashOpen(true); }}>Cash close / end shift</MenuItem>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button type="button" title="Settings" onClick={() => setMenu((m) => (m === "settings" ? null : "settings"))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white hover:border-blue-500 dark:border-slate-600 dark:bg-slate-800">
                            <Settings size={16} />
                        </button>
                        {menu === "settings" && (
                            <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                                <MenuItem chevron={false} icon={dark ? Sun : Moon} onClick={() => { setDark((d) => !d); setMenu(null); }}>{dark ? "Light theme" : "Dark theme"}</MenuItem>
                                <MenuItem chevron={false} icon={ConciergeBell} onClick={() => go(ROUTES.posWaiter)}>Waiter order</MenuItem>
                                <MenuItem chevron={false} icon={ArrowLeftRight} onClick={() => go(ROUTES.pos)}>Switch to POS V1</MenuItem>
                                <MenuItem chevron={false} icon={Home} onClick={() => go(ROUTES.home)}>Back to dashboard</MenuItem>
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={() => { setMenu(null); createNewSale(); }} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                        <Plus size={16} /> New sale
                    </button>
                </header>

                <div className="flex min-h-0 flex-1">
                    <section className="flex min-w-0 flex-1 flex-col">
                        <div className="shrink-0 px-4 pt-4">
                            <div className="flex items-baseline gap-3">
                                <p className="text-xl font-bold">{heading}</p>
                                <span className="text-sm text-slate-400">{products.length} items</span>
                                {activeId !== null && (
                                    <button type="button" onClick={clearFilter} className="ml-auto text-sm font-semibold text-blue-600 hover:underline">Clear filter</button>
                                )}
                            </div>
                            {chips.length > 0 && (
                                <div className="relative mt-3 flex items-center gap-2">
                                    <button type="button" onClick={() => setSubId(null)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${subId === null ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 hover:border-blue-500 dark:border-slate-600"}`}>
                                        All <span className="opacity-70">{countFor(parentId)}</span>
                                    </button>
                                    {chips.slice(0, CHIP_LIMIT).map((c) => (
                                        <button key={c.id} type="button" onClick={() => setSubId(c.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${subId === c.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 hover:border-blue-500 dark:border-slate-600"}`}>
                                            {c.label} <span className="opacity-60">{countFor(c.id)}</span>
                                        </button>
                                    ))}
                                    {chips.length > CHIP_LIMIT && (
                                        <div className="relative ml-auto" onClick={(e) => e.stopPropagation()}>
                                            <button type="button" onClick={() => setMoreOpen((o) => !o)} className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold hover:border-blue-500 dark:border-slate-600">
                                                More +{chips.length - CHIP_LIMIT} <ChevronDown size={14} />
                                            </button>
                                            {moreOpen && (
                                                <div className="soft-scrollbar absolute right-0 top-10 z-30 max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                                                    {chips.slice(CHIP_LIMIT).map((c) => (
                                                        <button key={c.id} type="button" onClick={() => { setSubId(c.id); setMoreOpen(false); }} className="flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                                                            {c.label} <span className="text-slate-400">{countFor(c.id)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
                            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
                            {loading ? (
                                <p className="py-16 text-center text-sm text-slate-400">Loading products…</p>
                            ) : products.length === 0 ? (
                                <p className="py-16 text-center text-sm text-slate-400">No products found.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                                        {products.slice(0, visible).map((p) => (
                                            <ProductCard key={p.id} product={p} categoryLabel={labelById.get(String(p.categoryId))} onAdd={(prod) => addToCart(prod)} />
                                        ))}
                                    </div>
                                    {products.length > visible && (
                                        <div className="py-4 text-center">
                                            <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800">
                                                Load more · {products.length - visible} left
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    <div className="shrink-0 p-2 pl-0">
                        <CartPanelV2 cart={cart} onRemove={removeFromCart} total={total} cashSessionOpen={cashSessionOpen} />
                    </div>
                </div>
            </main>

            {heldOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setHeldOpen(false)}>
                    <aside className="flex h-full w-[360px] max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">Held sales <span className="text-slate-400">({heldCount})</span></p>
                            <button type="button" onClick={() => setHeldOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-600"><X size={16} /></button>
                        </div>
                        <div className="px-3 pt-3">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-600">
                                <Search size={14} className="text-slate-400" />
                                <input value={heldQuery} onChange={(e) => setHeldQuery(e.target.value)} placeholder="Search held sales..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                            </div>
                        </div>
                        <div className="soft-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                            {[...sales].reverse().filter((sale) => {
                                const q = heldQuery.trim().toLowerCase();
                                if (!q) return true;
                                const c = customersByPlace[sale.place];
                                return `sale ${sale.place} ${c?.name || ""} ${(cartsByPlace[sale.place] || []).map((i) => i.name).join(" ")}`.toLowerCase().includes(q);
                            }).map((sale) => {
                                const items = cartsByPlace[sale.place] || [];
                                const customer = customersByPlace[sale.place];
                                const active = sale.place === activePlace;
                                const saleTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
                                return (
                                    <div key={sale.place} className={`rounded-xl border p-3 ${active ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-200 dark:border-slate-700"}`}>
                                        <p className="flex items-center gap-2 text-sm font-bold">
                                            Sale {sale.place.replace("-", " - ")}
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${draftInvoicesByPlace[sale.place] ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{draftInvoicesByPlace[sale.place] ? "Draft saved" : "Not saved"}</span>
                                            {active && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Current</span>}
                                            <span className="ml-auto text-xs font-normal text-slate-400">{sale.time}</span>
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">{customer?.name || customer?.label || "No customer"} · {items.length} {items.length === 1 ? "line" : "lines"}</p>
                                        {items.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {items.map((it) => (
                                                    <span key={it.id} className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] dark:border-slate-600">{it.qty}× {it.name}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center gap-2">
                                            <p className="flex-1 text-base font-bold">ZMW {formatAmount(saleTotal)}</p>
                                            <button type="button" onClick={() => { switchSale(sale.place); setHeldOpen(false); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{active ? "Open" : "Resume"}</button>
                                            {sale.place !== "0" && (
                                                <button type="button" title="Delete sale" onClick={() => deleteSale(sale.place)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={15} /></button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                </div>
            )}

            <Suspense fallback={null}>
                {cashOpen && <CashDeskModal open={cashOpen} onClose={() => setCashOpen(false)} onLogout={logout} />}
                {creditOpen && <CreditNoteModalV2 onClose={() => setCreditOpen(false)} />}
                {reportsOpen && <InvoiceHistory onClose={() => setReportsOpen(false)} />}
            </Suspense>
            <SyncConfirm open={syncAsk} onNo={() => setSyncAsk(false)} onYes={() => { setSyncAsk(false); sync(); }} />
            <CartToast />
        </div>
    );
}

export default PosV2;
