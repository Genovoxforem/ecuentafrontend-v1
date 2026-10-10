import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingCart, ShoppingBag, Store } from "lucide-react";
import usePosStore from "../pos/features/pos/stores/posStore";
import { formatAmount } from "../pos/utils/currency";
import { computeCartTotals } from "../pos/features/payment/services/paymentService";
import { COMPANY_NAME } from "./company";
import "../pos/index.css";

// Second-screen view of a sale (?place=<sale>&terminal=<n>): the current order on the left and a
// welcome panel on the right. The POS keeps its sales in localStorage, so this window follows the
// cashier's cart by rehydrating whenever that storage changes (same browser profile only).
export default function CustomerDisplayV2() {
    const [params] = useSearchParams();
    const place = params.get("place") || "0";
    const cartsByPlace = usePosStore((s) => s.cartsByPlace);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const sync = () => usePosStore.persist?.rehydrate?.();
        window.addEventListener("storage", sync);
        const poll = setInterval(sync, 1500);
        const clock = setInterval(() => setNow(new Date()), 1000);
        return () => {
            window.removeEventListener("storage", sync);
            clearInterval(poll);
            clearInterval(clock);
        };
    }, []);

    const items = cartsByPlace[place] || [];
    const { subtotalExcl, tax } = computeCartTotals(items);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    return (
        <div style={{ background: "#f1f5f9" }} className="pos-app pos-v2-root pos-light flex h-screen flex-col bg-slate-100 text-slate-800">
            <header className="flex items-center justify-between bg-slate-800 px-8 py-4 text-white">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-light tracking-wide">ECUENTA</span>
                    <span className="text-2xl font-extrabold uppercase">{COMPANY_NAME}</span>
                </div>
                <div className="text-right leading-tight">
                    <p className="text-3xl font-bold tabular-nums">{now.toLocaleTimeString("en-GB")}</p>
                    <p className="text-sm">{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
            </header>

            <main className="grid min-h-0 flex-1 grid-cols-2 gap-6 p-6">
                <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 text-white">
                        <ShoppingCart size={26} />
                        <p className="text-2xl font-bold">Current Order</p>
                    </div>
                    <div className="grid grid-cols-[1fr_5rem_7rem_8rem] border-b border-slate-200 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span>Product</span><span className="text-right">Qty</span><span className="text-right">Price</span><span className="text-right">Total</span>
                    </div>
                    <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-6">
                        {items.length === 0 ? (
                            <div className="grid h-full place-items-center text-center text-slate-400">
                                <div>
                                    <ShoppingBag size={56} className="mx-auto mb-3" />
                                    <p className="text-xl">No items yet</p>
                                </div>
                            </div>
                        ) : (
                            items.map((i) => (
                                <div key={i.id} className="grid grid-cols-[1fr_5rem_7rem_8rem] border-b border-slate-100 py-3 text-lg">
                                    <span className="truncate font-semibold">{i.name}</span>
                                    <span className="text-right tabular-nums">{i.qty}</span>
                                    <span className="text-right tabular-nums">{formatAmount(i.price)}</span>
                                    <span className="text-right font-bold tabular-nums">{formatAmount(i.price * i.qty)}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
                        <div className="flex justify-between text-lg text-slate-500"><span>Subtotal</span><span>ZMW {formatAmount(subtotalExcl)}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-3 text-lg text-slate-500"><span>Tax</span><span>ZMW {formatAmount(tax)}</span></div>
                        <div className="flex justify-between text-3xl font-extrabold text-blue-600"><span>Total</span><span>ZMW {formatAmount(total)}</span></div>
                    </div>
                </section>

                <section className="grid place-items-center rounded-2xl bg-[#245580] p-8 text-center text-white shadow-lg">
                    <div>
                        <Store size={80} className="mx-auto mb-6" />
                        <p className="text-5xl font-extrabold">Welcome To {COMPANY_NAME}</p>
                        <p className="mt-6 text-2xl">Thank You For Your Visit</p>
                    </div>
                </section>
            </main>

            <footer className="bg-slate-800 py-4 text-center text-sm text-white">{COMPANY_NAME} - Thank You For Shopping</footer>
        </div>
    );
}
