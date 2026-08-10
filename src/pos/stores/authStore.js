import { create } from "zustand";

// Session/token ownership lives in the main app's AuthContext
// (src/features/auth/AuthContext.tsx) — this store only holds the
// POS-specific pieces that context doesn't carry: the terminal_config
// (terminal number, warehouse, payment methods) fetched once via
// usePosSession() when entering /pos, and re-derived on demand by
// PosSidebar via fetchCurrentTerminalConfig() (see services/terminalConfig.js).
const useAuthStore = create((set) => ({
  user: null,
  terminalConfig: null,
  setUser: (user) => set({ user }),
  setTerminalConfig: (terminalConfig) => set({ terminalConfig }),
  logout: () => set({ user: null, terminalConfig: null }),
}));

export default useAuthStore;
