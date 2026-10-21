import { useState } from "react";
import { Heart, Info, Minus, Plus, Image as ImageIcon } from "lucide-react";
import { formatAmount } from "../pos/utils/currency";
import useFavourites from "./favourites";

// Product tile shared by the POS and waiter screens (mirrors the takeposnew waiter order card): info button top-left, "Stock: N"
// top-right, tall photo, name + price, then a round − (left) and a round green + (right).
export default function ProductTile({ product, categoryLabel, inCartQty, onAdd, onRemove }) {
    const [imgFailed, setImgFailed] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const isFav = useFavourites((s) => s.ids.has(product.id));
    const toggleFav = useFavourites((s) => s.toggle);
    const stock = product.stock === null || product.stock === undefined || product.stock === "" ? null : Number(product.stock);
    return (
        <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-700/80 dark:bg-[#0f1b2d]">
            <div className="flex h-6 items-start justify-between">
                <button
                    type="button"
                    aria-label="Product details"
                    aria-expanded={infoOpen}
                    onClick={() => setInfoOpen((o) => !o)}
                    className="grid h-5 w-5 place-items-center rounded-full bg-slate-500 text-white hover:bg-slate-600"
                >
                    <Info size={12} />
                </button>
                {stock !== null && !Number.isNaN(stock) && <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Stock: {stock}</span>}
            </div>
            {infoOpen && (
                <div className="absolute left-2 top-9 z-10 w-[85%] rounded-lg bg-slate-800 p-2 text-[13px] leading-[18px] text-white shadow-lg" onClick={() => setInfoOpen(false)}>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-slate-300">Ref: {product.ref || "—"}</p>
                    {categoryLabel && <p className="text-slate-300">Category: {categoryLabel}</p>}
                </div>
            )}
            <div className="relative mt-1 h-[150px] w-full overflow-hidden rounded-xl bg-white">
                {product.image && !imgFailed ? (
                    <img src={product.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain object-center" onError={() => setImgFailed(true)} />
                ) : (
                    <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400 dark:bg-slate-800"><ImageIcon size={32} strokeWidth={1.25} /></div>
                )}
                <button
                    type="button"
                    aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
                    aria-pressed={isFav}
                    title={isFav ? "Remove from favourites" : "Add to favourites"}
                    onClick={() => toggleFav(product.id)}
                    className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:text-rose-500 active:scale-90"
                >
                    <Heart size={17} className={isFav ? "fill-rose-500 text-rose-500" : ""} />
                </button>
            </div>
            <p className="mt-1.5 line-clamp-2 min-h-[30px] text-[15px] font-bold uppercase leading-[19px] text-slate-900 dark:text-slate-50" title={product.name}>{product.name}</p>
            <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-blue-900 dark:text-blue-300">{formatAmount(product.price)} ZMW</p>
            <div className="mt-auto flex items-center justify-between pt-1.5">
                <button
                    type="button"
                    aria-label="Remove one"
                    disabled={inCartQty === 0}
                    onClick={() => onRemove(product)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
                >
                    <Minus size={16} />
                </button>
                {inCartQty > 0 && <span className="text-base font-bold tabular-nums">{inCartQty}</span>}
                <button
                    type="button"
                    aria-label="Add one"
                    onClick={() => onAdd(product)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                >
                    <Plus size={18} />
                </button>
            </div>
        </div>
    );
}
