import { TABLE_STATUS } from "../statusMeta";

// No backend endpoint exists for table floors (only tables.php exists in
// takeposnew/api/), so this throws and the UI shows a "not available" state
// instead of fake tables. If an endpoint is added later, wire it in here.

export const FLOOR_COUNT = 0;
export const TABLES_PER_ROW = 7;

export const fetchFloorTables = async () => {
    throw new Error("No backend endpoint exists for table floors");
};

export const saveTableStatuses = async () => {
    throw new Error("No backend endpoint exists for saving table statuses");
};
