import { HelpCircle } from "lucide-react";

// "Sync Cache" confirmation shared by the POS and waiter screens.
export default function SyncConfirm({ open, onNo, onYes }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onClick={onNo}>
            <div className="w-full max-w-md overflow-hidden rounded-xl border-l-8 border-amber-400 bg-white px-8 py-7 text-center text-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-400 text-white"><HelpCircle size={26} /></span>
                <p className="text-xl font-bold">Sync Cache</p>
                <p className="mt-2 text-sm text-slate-500">Sync products and categories from server? This will refresh all cached data.</p>
                <div className="mt-5 flex justify-center gap-2">
                    <button type="button" onClick={onNo} className="rounded-md bg-slate-500 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-600">No</button>
                    <button type="button" onClick={onYes} className="rounded-md bg-slate-800 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-900">Yes</button>
                </div>
            </div>
        </div>
    );
}
