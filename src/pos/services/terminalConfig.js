import { get } from "./axios";

// Re-derives this terminal's config (default customer, payment methods,
// warehouse) from whatever Dolibarr's CASHDESK_ID_* constants currently say.
// Legacy gets this for free every page load — index.php is server-rendered
// PHP, so a browser refresh re-runs its
// `getDolGlobalString('CASHDESK_ID_THIRDPARTY'.$terminal)` lookup from
// scratch. This SPA only fetches terminal_config on entering /pos and then
// persists it, so without a call like this a plain refresh would keep
// showing whatever was configured last even after an admin changes it in
// Dolibarr — see PosSidebar.jsx, which calls this on every mount and merges
// the result back in. X-API-Key/bearer only, no password needed, so it's
// safe to call silently.
export const fetchCurrentTerminalConfig = async () => {
  const res = await get("/api/general/index.php");
  const tc = res.settings?.terminal_config;
  if (!tc) return null;
  return {
    terminalNumber: tc.terminal_number,
    defaultCustomerId: tc.customer_id,
    customer_id: tc.customer_id,
    warehouse_id: tc.warehouse_id,
    payment_methods: tc.payment_methods,
  };
};
