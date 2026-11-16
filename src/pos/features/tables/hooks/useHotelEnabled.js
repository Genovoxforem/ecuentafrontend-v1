import { useEffect, useState } from "react";
import { fetchHotelEnabled } from "../services/roomApi";

// true / false once the backend has answered, null while loading or when the answer cannot be read.
export const useHotelEnabled = () => {
    const [enabled, setEnabled] = useState(null);
    useEffect(() => {
        let alive = true;
        fetchHotelEnabled().then((v) => {
            if (alive) setEnabled(v);
        });
        return () => {
            alive = false;
        };
    }, []);
    return enabled;
};
