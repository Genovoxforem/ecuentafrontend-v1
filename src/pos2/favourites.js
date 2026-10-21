import { create } from "zustand";

const KEY = "pos_v2_favs";

const read = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
        return new Set();
    }
};

// Favourite products for the POS and waiter screens. There is no backend for this, so the ids are kept in
// this browser's localStorage; the store makes the heart on every tile (and the "Favourites first" sort) update together.
const useFavourites = create((set, get) => ({
    ids: read(),
    toggle: (id) => {
        const next = new Set(get().ids);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
            localStorage.setItem(KEY, JSON.stringify([...next]));
        } catch {
            /* storage unavailable — keep in memory only */
        }
        set({ ids: next });
    },
}));

export default useFavourites;
