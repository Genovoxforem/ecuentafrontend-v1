import { useMemo, useState } from "react";
import { Search, LayoutGrid, Utensils, ChevronRight, ChevronLeft, Image as ImageIcon, ArrowRight } from "lucide-react";
import { useCategories } from "../pos/features/categories/hooks/useCategories";
import { useProducts } from "../pos/features/products/hooks/useProducts";
import { formatAmount } from "../pos/utils/currency";
import "../pos/index.css";
import { COMPANY_NAME } from "./company";

const GOLD = "#b8862d";
const PAGE = 8;
import BANNER from "./menu-header.png";

// Customer-facing menu: hero with search, a category chip rail, then one numbered section per category
// (A–Z). Each section shows a few dishes in two columns with "View all" to expand. Products come from the
// same JSON as the POS; photos show when a product has one (the API has no dish descriptions).
export default function PublicMenuV2() {
    const { categories } = useCategories();
    const { products, loading } = useProducts({ search: "", withUom: false });
    const [query, setQuery] = useState("");
    const [hasBanner, setHasBanner] = useState(true);
    const [active, setActive] = useState(null);
    const [expanded, setExpanded] = useState({});

    const sections = useMemo(() => {
        const q = query.trim().toLowerCase();
        const byCat = new Map();
        for (const p of products) {
            if (q && !p.name.toLowerCase().includes(q)) continue;
            byCat.set(String(p.categoryId), [...(byCat.get(String(p.categoryId)) || []), p]);
        }
        return categories
            .map((c) => ({ id: c.id, label: c.label, items: byCat.get(String(c.id)) || [] }))
            .filter((s) => s.items.length > 0)
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    }, [categories, products, query]);

    const shown = active === null ? sections : sections.filter((s) => s.id === active);
    const words = COMPANY_NAME.split(" ");
    const last = words.pop();

    const chip = (on) => `flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm ${on ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-700 hover:border-amber-600"}`;

    return (
        <div className="pos-v2-root flex h-screen flex-col overflow-hidden bg-[#fdfaf4] text-slate-900">
            <header className="relative bg-[#050d1a] text-center text-white">
                {hasBanner ? (
                    <div className="relative aspect-[5.7/1] w-full overflow-hidden bg-[#050d1a]">
                        <img src={BANNER} alt={COMPANY_NAME} className="block h-full w-full object-cover object-center" onError={() => setHasBanner(false)} />
                    </div>
                ) : (
                    <div className="bg-gradient-to-b from-[#0f1a2b] via-[#14233a] to-[#1a2c46] px-6 pb-14 pt-8">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-300">Restaurant Menu</p>
                        <h1 className="mt-2 font-serif text-5xl">
                            {words.join(" ")} <span style={{ color: "#e2b04a" }}>{last}</span>
                        </h1>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-300">Authentic Flavours · Memorable Moments</p>
                    </div>
                )}
                <label className="absolute inset-x-0 bottom-0 mx-auto flex max-w-xl translate-y-1/2 items-center gap-3 rounded-full border-2 bg-white px-5 py-3 text-slate-800 shadow-lg" style={{ borderColor: GOLD }}>
                    <Search size={16} className="text-slate-500" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for dishes, e.g. Biryani, Chicken, Coffee..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
            </header>

            <main className="mx-auto flex min-h-0 w-full max-w-[72rem] flex-1 flex-col px-6">
                <div className="mb-4 mt-10 flex shrink-0 items-center gap-2">
                    <button type="button" aria-label="Scroll categories left" onClick={() => document.getElementById("chips")?.scrollBy({ left: -360, behavior: "smooth" })} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-white"><ChevronLeft size={16} /></button>
                    <div id="chips" className="flex flex-1 gap-3 overflow-x-auto pb-2 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button type="button" onClick={() => setActive(null)} className={chip(active === null)} style={active === null ? { background: GOLD } : undefined}>
                            <LayoutGrid size={15} /> All Items
                        </button>
                        {sections.map((s) => (
                            <button key={s.id} type="button" onClick={() => setActive(s.id)} className={chip(active === s.id)} style={active === s.id ? { background: GOLD } : undefined}>
                                <Utensils size={15} style={active === s.id ? undefined : { color: GOLD }} /> {s.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" aria-label="Scroll categories" onClick={() => document.getElementById("chips")?.scrollBy({ left: 360, behavior: "smooth" })} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-white"><ChevronRight size={16} /></button>
                </div>

                <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto pb-8 pr-2 [scroll-snap-type:y_proximity]">
                {loading && <p className="py-20 text-center text-slate-500">Loading menu…</p>}
                {!loading && shown.length === 0 && <p className="py-20 text-center text-slate-500">No dishes found.</p>}

                {shown.map((s, i) => {
                    const all = active !== null || expanded[s.id];
                    const items = all ? s.items : s.items.slice(0, PAGE);
                    return (
                        <section key={s.id} className="mb-8 [scroll-snap-align:start]">
                            <div className="flex items-center gap-3">
                                <span className="font-serif text-xl" style={{ color: GOLD }}>{String(i + 1).padStart(2, "0")}</span>
                                <h2 className="font-serif text-2xl uppercase tracking-wide">{s.label}</h2>
                                <i className="h-px flex-1" style={{ background: "#e6d3a8" }} />
                                <span className="text-xs text-slate-500">{s.items.length} {s.items.length === 1 ? "PRODUCT" : "PRODUCTS"}</span>
                                {active === null && s.items.length > PAGE && (
                                    <button type="button" onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))} className="flex items-center gap-1 text-sm font-semibold" style={{ color: GOLD }}>
                                        {expanded[s.id] ? "Show less" : "View all"} <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {items.map((p) => (
                                    <div key={p.id} className="flex items-center gap-4 overflow-hidden rounded-xl bg-white p-2 pr-4 shadow-sm ring-1 ring-black/5">
                                        <div className="grid h-[4.5rem] w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-amber-50 text-amber-300">
                                            {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /> : <ImageIcon size={26} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{p.name}</p>
                                            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><i className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Available</p>
                                        </div>
                                        <p className="shrink-0 text-right font-serif text-lg"><span className="mr-1 text-[10px] font-sans text-slate-500">ZMW</span><b>{formatAmount(p.price)}</b></p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
                </div>
            </main>
            <footer className="shrink-0 bg-[#0f1a2b] py-4 text-center text-xs tracking-widest text-slate-300">{COMPANY_NAME} • MENU</footer>
        </div>
    );
}
