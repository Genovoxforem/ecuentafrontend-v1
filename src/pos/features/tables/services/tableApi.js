import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";


const fetchLegacyTables = async () => {
    const response = await fetch(buildRequestUrl("/takeposnew/api/tables.php?action=list"), {
        credentials: "same-origin",
        headers: dynamicProxyHeaders(),
    });
    let data;
    try {
        data = await response.json();
    } catch {
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
        throw new Error(`Cannot fetch tables — not same-origin with backend (getApiBaseUrl="${getApiBaseUrl()}")`);
    }
    return fetchLegacyTables();
};
