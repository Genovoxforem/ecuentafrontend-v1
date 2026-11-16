import { useState } from "react";
import useTableStore from "../stores/tableStore";
import usePosStore from "../../pos/stores/posStore";
import { fetchReceipt } from "../../reports/services/receiptApi";

// Picks a table for the order. A free table starts an empty order; an occupied table's open invoice is loaded into the cart so it can be
// added to and paid (the same behaviour the table selector next to the cart always had). `select` resolves true once the table is chosen,
// false when its order could not be loaded (the message is in `error`) or another pick is still loading.
export function useTableSelection() {
    const selectTable = useTableStore((state) => state.selectTable);
    const loadInvoiceIntoCart = usePosStore((state) => state.loadInvoiceIntoCart);
    const clearCart = usePosStore((state) => state.clearCart);
    const showToast = usePosStore((state) => state.showToast);
    const [resumingId, setResumingId] = useState(null);
    const [error, setError] = useState("");

    const select = async (table) => {
        if (resumingId) return false;
        setError("");
        let loadedExisting = false;
        if (table.occupied && table.invoiceId) {
            setResumingId(table.id);
            try {
                const receipt = await fetchReceipt(table.invoiceId);
                const items = (receipt.lines || []).map((line) => ({
                    id: line.product_id,
                    name: line.product_label || line.description || "Item",
                    ref: line.product_ref || "",
                    price: line.qty > 0 ? line.total_ttc / line.qty : line.price_unit,
                    qty: line.qty,
                }));
                if (items.length > 0) {
                    const totalPaid = (receipt.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    const remainToPay = Math.max(0, (Number(receipt.total_ttc) || 0) - totalPaid);
                    loadInvoiceIntoCart({ id: table.invoiceId, ref: receipt.invoice_ref, remainToPay, items });
                    showToast(`${table.label}'s order loaded — ${items.length} item${items.length === 1 ? "" : "s"}`);
                    loadedExisting = true;
                }
            } catch (err) {
                setError(err.message || "Failed to load this table's order");
                setResumingId(null);
                return false;
            }
            setResumingId(null);
        }
        if (!loadedExisting) {
            clearCart();
            showToast(`${table.label} selected — ready for a new order`);
        }
        selectTable(table);
        return true;
    };

    return { select, resumingId, error };
}
