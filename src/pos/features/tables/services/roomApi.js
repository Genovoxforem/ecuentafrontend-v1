// No backend endpoint exists for POS rooms (only tables.php exists in
// takeposnew/api/). Previously this returned hardcoded mock data — now it
// throws so the UI can show an honest "not available" state instead of
// fake rooms. If a real endpoint is added later, wire it in here.

export const FLOOR_COUNT = 0;
export const ROOMS_PER_ROW = 7;

export const fetchRooms = async () => {
    throw new Error("No backend endpoint exists for POS rooms");
};

export const saveRoomStatuses = async () => {
    throw new Error("No backend endpoint exists for saving room statuses");
};
