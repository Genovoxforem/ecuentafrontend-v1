import { get } from "../../../services/axios";

// GET takepos/fapi/tables.php (API #386, X-API-Key, {success, data, message, errors}). Read on newecuenta on 6 Nov 2026 (134 tables):
//   data.floors  [{ floor: "1", tables: 34, occupied: 1 }, ...]          (floor is a string)
//   data.tables  [{ id, label, floor: "1", occupied, open_order: null | { id, ref, token, total_ttc, date } }, ...]
//   data.totals  { tables, occupied }, data.basis (the endpoint's own words for what "occupied" means)
// `id` is the POS place of the table (VIP1 = 1 = the "POS1-1" ref_client of its open invoice), so it is what the order is saved against.
// Not in the answer (the classic takeposnew/api/tables.php?action=list has them): item and kitchen-status counts of the open order,
// leftpos / toppos. They are not invented here: itemCount is null (unknown), and nothing is placed by position.

export const fetchTablesPayload = async () => {
    const res = await get("/takepos/fapi/tables.php");
    if (res?.success === false) throw new Error(res.message || "Failed to load tables");
    const data = res?.data;
    if (!data || !Array.isArray(data.tables) || !Array.isArray(data.floors)) {
        throw new Error("takepos/fapi/tables.php did not answer with floors and tables");
    }
    return data;
};

// The shape the POS screens already use (useTables / TableSelectorModal / TableChooserV2 / WaiterOrderV2).
export const toPosTable = (t) => ({
    id: t.id,
    label: t.label,
    occupied: t.occupied === true,
    invoiceId: t.open_order?.id ?? null,
    invoiceRef: t.open_order?.ref ?? null,
    itemCount: null,
    floor: t.floor ?? null,
    totalTtc: Number(t.open_order?.total_ttc) || 0,
});

export const toPosFloor = (f) => ({
    floor: String(f.floor),
    tables: Number(f.tables) || 0,
    occupied: Number(f.occupied) || 0,
});

// Floors in numeric order ("10" would sort before "2" as text); tables stay in the order the endpoint sends them (label order, as the classic list).
export const fetchFloorPlan = async () => {
    const data = await fetchTablesPayload();
    return {
        floors: data.floors.map(toPosFloor).sort((a, b) => Number(a.floor) - Number(b.floor)),
        tables: data.tables.map(toPosTable),
    };
};
