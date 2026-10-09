import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, X, ChevronDown } from "lucide-react";
import { useCustomers } from "../pos/features/customers/hooks/useCustomers";
import usePosStore from "../pos/features/pos/stores/posStore";
import useAuthStore from "../pos/stores/authStore";
import { fetchCustomerById } from "../pos/features/customers/services/customerApi";
import AddCustomerModal from "../pos/features/customers/Components/AddCustomerModal";

const initials = (name = "") =>
    name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("");

// Compact customer card: avatar + name + TPIN, opens a search dropdown. Same store and
// default-customer behaviour as the V1 selector, drawn as one card instead of input + card.
export default function CustomerPickerV2() {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const { customers, loading } = useCustomers(query);
    const selected = usePosStore((s) => s.selectedCustomer);
    const setSelected = usePosStore((s) => s.setSelectedCustomer);
    const activePlace = usePosStore((s) => s.activePlace);
    const hasHydrated = usePosStore((s) => s.hasHydrated);
    const showToast = usePosStore((s) => s.showToast);
    const defaultCustomerId = useAuthStore((s) => s.terminalConfig?.defaultCustomerId);
    const ref = useRef(null);

    useEffect(() => {
        if (!hasHydrated || !defaultCustomerId || selected != null) return;
        fetchCustomerById(defaultCustomerId)
            .then((c) => {
                if (c) {
                    setSelected(c);
                    showToast(`Default customer loaded: ${c.name}`);
                }
            })
            .catch((err) => showToast(`Failed to load default customer: ${err.message}`, "error"));
    }, [hasHydrated, activePlace, selected, defaultCustomerId, setSelected, showToast]);

    useEffect(() => {
        const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        document.addEventListener("mousedown", away);
        return () => document.removeEventListener("mousedown", away);
    }, []);

    const pick = (c) => {
        setSelected(c);
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 text-left hover:border-blue-500 dark:border-slate-700"
            >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500 text-sm font-bold text-white">{selected ? initials(selected.name) : "?"}</span>
                <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</span>
                    <span className="block truncate text-sm font-bold">{selected ? selected.name : "Select customer"}</span>
                    {selected && <span className="block truncate text-[11px] text-slate-400">TPIN: {selected.tpin || "—"}</span>}
                </span>
                <ChevronDown size={16} className="shrink-0 text-slate-400" />
            </button>

            {open && (
                <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
                    <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-600">
                        <Search size={14} className="text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Name, TPIN, phone or email"
                            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                    </div>
                    <button type="button" onClick={() => { setOpen(false); setAddOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <UserPlus size={14} /> Add new customer
                    </button>
                    {selected && (
                        <button type="button" onClick={() => { setSelected(null); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-slate-700">
                            <X size={14} /> Clear selected customer
                        </button>
                    )}
                    <div className="soft-scrollbar max-h-60 overflow-y-auto border-t border-slate-200 dark:border-slate-600">
                        {query.trim().length < 2 ? (
                            <p className="px-3 py-3 text-xs text-slate-400">Type at least 2 characters to search.</p>
                        ) : loading ? (
                            <p className="px-3 py-3 text-xs text-slate-400">Searching…</p>
                        ) : customers.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-slate-400">No customers found.</p>
                        ) : (
                            customers.map((c) => (
                                <button key={c.id} type="button" onClick={() => pick(c)} className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700">
                                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                                    <span className="block text-xs text-blue-600">TPIN: {c.tpin || "—"}</span>
                                    <span className="block truncate text-xs text-slate-400">{c.phone || c.email || ""}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={(c) => { setSelected(c); setAddOpen(false); }} />
        </div>
    );
}
