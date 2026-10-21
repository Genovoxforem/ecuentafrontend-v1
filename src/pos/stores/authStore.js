import { create } from "zustand";

// Session/token ownership lives in the main app's AuthContext
// (src/features/auth/AuthContext.tsx) — this store only holds the
// POS-specific pieces that context doesn't carry: the terminal_config
// (terminal number, warehouse, payment methods) fetched once via
// usePosSession() when entering /pos, and re-derived on demand by
// PosSidebar via fetchCurrentTerminalConfig() (see services/terminalConfig.js).
const COMPANY_CACHE_KEY = "pos_company_name";
function readCachedCompanyName() {
  try {
    return localStorage.getItem(COMPANY_CACHE_KEY) || "";
  } catch {
    return "";
  }
}

const useAuthStore = create((set) => ({
  user: null,
  terminalConfig: null,
  // Business name from api/general/index.php (settings.app_name). Last known value is kept in
  // localStorage so a reload paints the right name straight away instead of a blank/placeholder.
  companyName: readCachedCompanyName(),
  setCompanyName: (name) => {
    try {
      if (name) localStorage.setItem(COMPANY_CACHE_KEY, name);
    } catch {
      /* storage unavailable — keep in memory only */
    }
    set({ companyName: name || "" });
  },
  setUser: (user) => set({ user }),
  setTerminalConfig: (terminalConfig) => set({ terminalConfig }),
  logout: () => set({ user: null, terminalConfig: null }),
}));

export default useAuthStore;
