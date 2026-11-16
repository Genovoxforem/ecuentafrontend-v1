import { fetchFloorPlan } from "./tables.data";

// The tables of every floor with their live occupancy, from takepos/fapi/tables.php (key-authenticated JSON). This used to read the
// session-only takeposnew/api/tables.php?action=list, which answered the login page after a page reload (AN-174).
export const fetchTables = async () => (await fetchFloorPlan()).tables;
