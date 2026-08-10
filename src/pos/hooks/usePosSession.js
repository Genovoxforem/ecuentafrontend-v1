import { useEffect } from "react";
import { get } from "../services/axios";
import useAuthStore from "../stores/authStore";

// POS used to run its own login/session — now it's mounted inside the main
// app's authenticated tree (see src/App.tsx's /pos route), so the bearer
// token is already sitting in the main app's storage (src/api/axios.ts) by
// the time this mounts. This just derives `user` and `terminalConfig` from
// it — the one endpoint that already returns both from bearer-token auth
// alone (no password), same call PosSidebar's own periodic refresh already
// makes via fetchCurrentTerminalConfig().
export function usePosSession() {
  useEffect(() => {
    let cancelled = false;
    get("/api/general/index.php")
      .then((res) => {
        if (cancelled || !res?.user) return;
        useAuthStore.getState().setUser({
          id: res.user.id,
          login: res.user.login,
          fullname: [res.user.firstname, res.user.lastname].filter(Boolean).join(" ") || res.user.login,
          admin: res.user.is_admin,
          entity: res.settings?.entity,
        });
        const tc = res.settings?.terminal_config;
        if (tc) {
          useAuthStore.getState().setTerminalConfig({
            terminalNumber: tc.terminal_number,
            defaultCustomerId: tc.customer_id,
            customer_id: tc.customer_id,
            warehouse_id: tc.warehouse_id,
            payment_methods: tc.payment_methods,
            passcode_enabled: !!tc.passcode_enabled,
          });
        }
      })
      .catch((err) => {
        console.warn("[pos-session] failed to load terminal session:", err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
}
