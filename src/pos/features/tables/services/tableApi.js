import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";


const MOCK_TABLES = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    label: `Table ${i + 1}`,
    occupied: (i + 1) % 4 === 0,
    invoiceId: null,
    itemCount: 0,
    floor: null,
    totalTtc: 0,
}));


const fetchLegacyTables = async () => {
    const response = await fetch(buildRequestUrl("/takeposnew/api/tables.php?action=list"), {
        credentials: "same-origin",
        headers: dynamicProxyHeaders(),
    });
    let data;
    try {
        data = await response.json();
    } catch {
        // Same failure mode as reports_data.php's non-JSON case — most
        // commonly means the session cookie wasn't actually sent/valid.
        throw new Error(`tables.php returned non-JSON (status ${response.status}) — likely no valid session cookie was sent`);
    }
    if (!data.success) throw new Error(data.error || "Failed to load tables");


    return data.tables.map((t) => ({
        id: t.rowid,
        label: t.label,
        occupied: t.status === "occupied",
        invoiceId: t.invoice_id || null,
        itemCount: t.item_count || 0,
        floor: t.floor || null,
        totalTtc: Number(t.total_ttc) || 0,
    }));
};

export const fetchTables = async () => {
    if (!isSameOriginBackend()) {
        console.info(`[legacy-tables] skipped — isSameOriginBackend() is false (getApiBaseUrl="${getApiBaseUrl()}"). Falling back to mock table data.`);
        return MOCK_TABLES;
    }
    try {
        const tables = await fetchLegacyTables();
        console.info(`[legacy-tables] tables.php succeeded — ${tables.length} real tables with real occupancy.`);
        return tables;
    } catch (err) {
        console.warn("[legacy-tables] tables.php failed, falling back to mock table data:", err.message);
        return MOCK_TABLES;
    }
};
