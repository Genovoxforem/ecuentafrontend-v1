import { useEffect, useState } from "react";
import { fetchTables } from "../services/tableApi";

// A failed read (no key, endpoint missing, a refusal) is kept and returned as `error`; it used to escape as an unhandled promise rejection
// (page test 5 Nov 2026).
export const useTables = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTables()
            .then(setTables)
            .catch((e) => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setLoading(false));
    }, []);

    return { tables, loading, error };
};
