import { lazy, Suspense, useMemo, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    LayoutGrid, Tag, Search, ScanBarcode, Layers, Plus, Moon, Sun, LogOut, ChevronDown, X, Settings,
    Trash2, ArrowLeftRight, Home, FileText, Undo2, UtensilsCrossed, Monitor, RefreshCw, Power, ChevronRight, ConciergeBell, Coins, ArrowUpDown,
} from "lucide-react";
import "../pos/index.css";
import { useTheme } from "../context/ThemeContext";
import usePosStore from "../pos/features/pos/stores/posStore";
import useAuthStore from "../pos/stores/authStore";
import { useCategories } from "../pos/features/categories/hooks/useCategories";
import { useProducts } from "../pos/features/products/hooks/useProducts";
import CartPanelV2 from "./CartPanelV2";
import { PRIMARY_BTN, PRIMARY_ACTIVE } from "./buttonStyles";
import { useCompanyName } from "./company";
import ProductTile from "./ProductTile";
import useFavourites from "./favourites";
import CreditNoteModalV2 from "./CreditNoteModalV2";
import SyncConfirm from "./SyncConfirm";
import CartToast from "../pos/features/pos/Components/CartToast";
import { usePosSession } from "../pos/hooks/usePosSession";
import { getActiveSession, getSummary, getTheoreticalAmount } from "../pos/features/cash/services/cashApi";
import { refreshCache, initCache } from "../pos/services/posCache";
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
    if (n <= 0) return { n, label: "Out of stock", dot: "bg-red-500", cls: "text-red-700 dark:text-red-300" };
    if (n <= 5) return { n, label: `Low stock: ${n}`, dot: "bg-amber-500", cls: "text-amber-800 dark:text-amber-300" };
    return { n, label: `In stock: ${n}`, dot: "bg-emerald-500", cls: "text-emerald-800 dark:text-emerald-300" };
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
            {chevron !== false && <ChevronRight size={15} className="text-slate-500 dark:text-slate-400" />}
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
    const companyName = useCompanyName();

    const cart = usePosStore((s) => s.cart);
    const sales = usePosStore((s) => s.sales);
    const searchTerm = usePosStore((s) => s.searchTerm);
    const setSearchTerm = usePosStore((s) => s.setSearchTerm);
    const addToCart = usePosStore((s) => s.addToCart);
    const removeFromCart = usePosStore((s) => s.removeFromCart);
    const changeQty = usePosStore((s) => s.changeQty);
    const createNewSale = usePosStore((s) => s.createNewSale);
    const cashSessionOpen = usePosStore((s) => s.cashSessionOpen);
    const setCashSessionOpen = usePosStore((s) => s.setCashSessionOpen);
    const activePlace = usePosStore((s) => s.activePlace);
    const cartsByPlace = usePosStore((s) => s.cartsByPlace);
    const customersByPlace = usePosStore((s) => s.customersByPlace);
    const draftInvoicesByPlace = usePosStore((s) => s.draftInvoicesByPlace);
    const switchSale = usePosStore((s) => s.switchSale);
    const deleteSale = usePosStore((s) => s.deleteSale);
    const showToast = usePosStore((s) => s.showToast);

    const [heldOpen, setHeldOpen] = useState(false);
    const [menu, setMenu] = useState(null);
    const [catQuery, setCatQuery] = useState("");
    const { theme: appTheme } = useTheme();
    // Follows the app theme (light app -> light POS); the in-POS toggle still overrides it until the app theme changes.
    const [dark, setDark] = useState(appTheme !== "light");
    useEffect(() => setDark(appTheme !== "light"), [appTheme]);
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
    const [sort, setSort] = useState("default");
    const [inStockOnly, setInStockOnly] = useState(false);
    const favIds = useFavourites((s) => s.ids);
    const searchRef = useRef(null);

    // Same check as POS V1's sidebar: the store assumes an open drawer until the backend says otherwise.
    // With no open session on this terminal the sale screen is locked and the "Cash Desk Control - New"
    // dialog opens so the cashier can open one (it also offers Logout).
    useEffect(() => {
        let cancelled = false;
        let timer;
        getActiveSession(terminal)
            .then((res) => {
                if (cancelled || !res.success) return;
                setCashSessionOpen(!!res.session);
                if (!res.session) timer = setTimeout(() => !cancelled && setCashOpen(true), 600);
            })
            .catch((err) => {
                if (!cancelled) showToast(err.message || "Unable to reach the server", "error");
            });
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [terminal, setCashSessionOpen, showToast]);

    // Cash expected in this terminal's drawer: the open session's expected amount, or the theoretical amount when none is open.
    const { data: cashAmount } = useQuery({
        queryKey: ["cashChip", terminal],
        refetchInterval: 60000,
        queryFn: async () => {
            const res = await getActiveSession(terminal);
            if (res.success && res.session) {
                const sum = await getSummary(res.session.id, terminal);
                return sum.success ? Number(sum.summary.expected_amount) : null;
            }
            const theo = await getTheoreticalAmount(terminal);
            return theo.success ? Number(theo.theoretical_amount) : null;
        },
    });

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
        const list = allProducts.filter((p) => {
            if (ids && !ids.has(String(p.categoryId))) return false;
            if (inStockOnly) {
                const t = stockTone(p.stock);
                if (t && t.n <= 0) return false;
            }
            if (!q) return true;
            return [p.name, p.ref, p.barcode].some((v) => String(v ?? "").toLowerCase().includes(q));
        });
        if (sort === "price-asc") return [...list].sort((a, b) => Number(a.price) - Number(b.price));
        if (sort === "price-desc") return [...list].sort((a, b) => Number(b.price) - Number(a.price));
        if (sort === "fav") return [...list].sort((a, b) => Number(favIds.has(b.id)) - Number(favIds.has(a.id)));
        if (sort === "name") return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
        return list;
    }, [allProducts, activeId, searchTerm, descendantIds, sort, inStockOnly, favIds]);

    const cartQtyById = useMemo(() => new Map(cart.map((i) => [i.id, i.qty])), [cart]);
    // Cart lines restored from a held/draft sale can lack the photo — fall back to the live product list.
    const imageById = useMemo(() => new Map(allProducts.filter((p) => p.image).map((p) => [p.id, p.image])), [allProducts]);

    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
    const heldCount = sales.filter((x) => x.place !== activePlace).length;
    const chips = parentId !== null ? childrenOf(parentId) : [];
    const heading = activeId !== null ? labelById.get(String(activeId)) : "All items";

    useEffect(() => setVisible(PAGE_SIZE), [activeId, searchTerm]);
    // Same one-time notice as the classic POS once its product/customer cache is ready.
    useEffect(() => {
        if (sessionStorage.getItem("pos_cache_notice")) return;
        initCache()
            .then(() => {
                sessionStorage.setItem("pos_cache_notice", "1");
                showToast("Products, categories, and customers updated");
            })
            .catch(() => {});
    }, [showToast]);
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
        <div className={`pos-app pos-v2-root flex h-screen overflow-hidden ${dark ? "dark bg-[#0b1220] text-[#f1f5f9]" : "pos-light bg-[#eef2f7] text-slate-900"}`} onClick={() => menu && setMenu(null)}>
            <aside className="flex w-[200px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="px-3 pb-2 pt-3">
                    <p className="text-sm font-semibold">Categories</p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 dark:border-slate-700 dark:bg-[#111d30]">
                        <Search size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
                        <input value={catQuery} onChange={(e) => setCatQuery(e.target.value)} placeholder="Find category" className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
                    </div>
                </div>
                <nav className="soft-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
                    {[{ id: null, label: "All items" }, ...tops.filter((t) => !catQuery.trim() || String(t.label).toLowerCase().includes(catQuery.trim().toLowerCase()))].map((c) => {
                        const active = c.id === parentId;
                        return (
                            <button
                                key={c.id ?? "all"}
                                type="button"
                                onClick={() => pickParent(c.id)}
                                title={c.label}
                                className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-semibold transition ${
                                    active ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                }`}
                            >
                                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${active ? "bg-blue-600 text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                    {c.id === null ? <LayoutGrid size={16} /> : <Tag size={16} />}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{c.id === null ? allProducts.length : countFor(c.id)}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="flex items-center gap-3 border-t border-slate-200 p-3 dark:border-slate-700">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials}</span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">Terminal T{terminal}</p>
                    </div>
                    <button type="button" onClick={logout} title="Log out" className="grid h-9 w-9 place-items-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50">
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white">E</span>
                        <div className="leading-tight">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{companyName}</p>
                            <p className="text-base font-bold">Point of Sale</p>
                        </div>
                    </div>
                    <div className="flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-[#111d30]">
                        <Search size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                        <input
                            ref={searchRef}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search products or scan barcode"
                            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-500 dark:text-slate-400 sm:block">Ctrl K</kbd>
                        <ScanBarcode size={18} className="text-blue-600" />
                    </div>
                    <button type="button" onClick={() => { setMenu(null); setHeldOpen(true); }} className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-500 hover:shadow dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                        <Layers size={15} /> Held <span className="rounded-full bg-slate-100 px-1.5 text-xs dark:bg-slate-700">{heldCount}</span>
                    </button>
                    <div className="relative">
                        <button type="button" title="Terminal menu" onClick={() => setMenu((m) => (m === "terminal" ? null : "terminal"))} className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-500 hover:shadow dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                            <span className={`h-2 w-2 rounded-full ${cashSessionOpen ? "bg-emerald-500" : "bg-red-500"}`} /> Terminal {terminal}
                            {cashAmount != null && (
                                <>
                                    <i className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
                                    <Coins size={14} className="text-amber-500" /> {formatAmount(cashAmount)}
                                </>
                            )}{" "}
                            <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
                        </button>
                        {menu === "terminal" && (
                            <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-slate-300 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-800">
                                <div className="flex items-center gap-3 border-b border-slate-200 px-2 pb-3 pt-1 dark:border-slate-600">
                                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-500"><Monitor size={20} /></span>
                                    <div className="flex-1 leading-tight">
                                        <p className="font-bold">Terminal {terminal}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{name}</p>
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
                        <button type="button" title="Settings" onClick={() => setMenu((m) => (m === "settings" ? null : "settings"))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-blue-500 hover:shadow dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                            <Settings size={16} />
                        </button>
                        {menu === "settings" && (
                            <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-slate-300 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-800">
                                <MenuItem chevron={false} icon={dark ? Sun : Moon} onClick={() => { setDark((d) => !d); setMenu(null); }}>{dark ? "Light theme" : "Dark theme"}</MenuItem>
                                <MenuItem chevron={false} icon={ConciergeBell} onClick={() => go(ROUTES.posWaiter)}>Waiter order</MenuItem>
                                <MenuItem chevron={false} icon={ArrowLeftRight} onClick={() => go(ROUTES.pos)}>Switch to POS V1</MenuItem>
                                <MenuItem chevron={false} icon={Home} onClick={() => go(ROUTES.home)}>Back to dashboard</MenuItem>
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={() => { setMenu(null); createNewSale(); }} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-md shadow-blue-600/30 active:scale-95 ${PRIMARY_BTN}`}>
                        <Plus size={16} /> New sale
                    </button>
                </header>

                <div className="flex min-h-0 flex-1">
                    <section className="flex min-w-0 flex-1 flex-col">
                        <div className="shrink-0 px-2 pt-2">
                            <div className="flex items-baseline gap-3">
                                <p className="text-xl font-bold">{heading}</p>
                                <span className="text-sm text-slate-500 dark:text-slate-400">{products.length} items</span>
                                {activeId !== null && (
                                    <button type="button" onClick={clearFilter} className="text-sm font-semibold text-blue-600 hover:underline">Clear filter</button>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInStockOnly((v) => !v)}
                                        aria-pressed={inStockOnly}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${inStockOnly ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                                    >
                                        In stock only
                                    </button>
                                    <label className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        <ArrowUpDown size={13} />
                                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent py-0.5 text-xs font-semibold outline-none">
                                            <option value="default">Featured</option>
                                            <option value="fav">Favourites first</option>
                                            <option value="name">Name A–Z</option>
                                            <option value="price-asc">Price: low to high</option>
                                            <option value="price-desc">Price: high to low</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                            {chips.length > 0 && (
                                <div className="relative mt-3 flex items-center gap-2">
                                    <button type="button" onClick={() => setSubId(null)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${subId === null ? PRIMARY_ACTIVE : "border-slate-200 hover:border-blue-500 dark:border-slate-600"}`}>
                                        All <span className="opacity-70">{countFor(parentId)}</span>
                                    </button>
                                    {chips.slice(0, CHIP_LIMIT).map((c) => (
                                        <button key={c.id} type="button" onClick={() => setSubId(c.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${subId === c.id ? PRIMARY_ACTIVE : "border-slate-200 hover:border-blue-500 dark:border-slate-600"}`}>
                                            {c.label} <span className="opacity-60">{countFor(c.id)}</span>
                                        </button>
                                    ))}
                                    {chips.length > CHIP_LIMIT && (
                                        <div className="relative ml-auto" onClick={(e) => e.stopPropagation()}>
                                            <button type="button" onClick={() => setMoreOpen((o) => !o)} className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold hover:border-blue-500 dark:border-slate-600">
                                                More +{chips.length - CHIP_LIMIT} <ChevronDown size={14} />
                                            </button>
                                            {moreOpen && (
                                                <div className="soft-scrollbar absolute right-0 top-10 z-30 max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-300 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-800">
                                                    {chips.slice(CHIP_LIMIT).map((c) => (
                                                        <button key={c.id} type="button" onClick={() => { setSubId(c.id); setMoreOpen(false); }} className="flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                                                            {c.label} <span className="text-slate-500 dark:text-slate-400">{countFor(c.id)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
                            {loading ? (
                                <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading products…</p>
                            ) : products.length === 0 ? (
                                <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No products found.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] content-start gap-3">
                                        {products.slice(0, visible).map((p) => (
                                            <ProductTile key={p.id} product={p} categoryLabel={labelById.get(String(p.categoryId))} inCartQty={cartQtyById.get(p.id) || 0} onAdd={(prod) => addToCart(prod, 1)} onRemove={(prod) => changeQty(prod.id, -1)} />
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

                    <div className="shrink-0 py-2 pr-2">
                        <CartPanelV2 imageById={imageById} cart={cart} onRemove={removeFromCart} total={total} cashSessionOpen={cashSessionOpen} />
                    </div>
                </div>
            </main>

            {heldOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setHeldOpen(false)}>
                    <aside className="flex h-full w-[360px] max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">Held sales <span className="text-slate-500 dark:text-slate-400">({heldCount})</span></p>
                            <button type="button" onClick={() => setHeldOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-600"><X size={16} /></button>
                        </div>
                        <div className="px-3 pt-3">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-600">
                                <Search size={14} className="text-slate-500 dark:text-slate-400" />
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
                                            <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400">{sale.time}</span>
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
                                            <button type="button" onClick={() => { switchSale(sale.place); setHeldOpen(false); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${PRIMARY_BTN}`}>{active ? "Open" : "Resume"}</button>
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
                {cashOpen && (
                    <CashDeskModal
                        open={cashOpen}
                        onClose={() => {
                            setCashOpen(false);
                            queryClient.invalidateQueries({ queryKey: ["cashChip"] });
                        }}
                        onLogout={logout}
                    />
                )}
                {creditOpen && <CreditNoteModalV2 onClose={() => setCreditOpen(false)} />}
                {reportsOpen && <InvoiceHistory onClose={() => setReportsOpen(false)} />}
            </Suspense>
            <SyncConfirm open={syncAsk} onNo={() => setSyncAsk(false)} onYes={() => { setSyncAsk(false); sync(); }} />
            <CartToast />
        </div>
    );
}

export default PosV2;
