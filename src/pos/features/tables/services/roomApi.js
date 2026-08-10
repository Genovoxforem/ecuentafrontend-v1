
import { TABLE_STATUS } from "../statusMeta";

const STATUS_CYCLE = [
    TABLE_STATUS.AVAILABLE,
    TABLE_STATUS.OCCUPIED,
    TABLE_STATUS.RESERVED,
    TABLE_STATUS.BILLING,
    TABLE_STATUS.DISABLED,
    TABLE_STATUS.MAINTENANCE,
    TABLE_STATUS.AVAILABLE,
];

const makeRooms = (prefix, count) =>
    Array.from({ length: count }, (_, i) => ({
        id: `${prefix}${i + 1}`,
        label: `Room ${i + 1}`,
        status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    }));

const MOCK_ROOMS_BY_FLOOR = {
    1: [
        { id: "main-hall", label: "Main Hall", tables: makeRooms("t", 7) },
        { id: "family-room", label: "Family Room", tables: makeRooms("f", 7) },
    ],
    2: [{ id: "vip-room", label: "VIP Room", tables: makeRooms("vip", 7) }],
    3: [{ id: "outdoor", label: "Outdoor", tables: makeRooms("o", 7) }],
};

export const FLOOR_COUNT = 3;
export const ROOMS_PER_ROW = 7;

export const fetchRooms = async (floor) => MOCK_ROOMS_BY_FLOOR[floor] || [];


export const saveRoomStatuses = async (floor, sectionId, statusByTableId) => {
    const section = (MOCK_ROOMS_BY_FLOOR[floor] || []).find((s) => s.id === sectionId);
    if (!section) return;
    section.tables = section.tables.map((table) =>
        table.id in statusByTableId ? { ...table, status: statusByTableId[table.id] } : table
    );
};
