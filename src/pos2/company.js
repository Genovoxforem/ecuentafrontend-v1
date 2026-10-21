import useAuthStore from "../pos/stores/authStore";

// Business name shown on the POS V2 screens, the public menu and the customer display. It comes from
// api/general/index.php (settings.app_name — the company name configured on the backend), loaded by
// usePosSession(); the last value is cached so a reload doesn't flash a placeholder. Empty until known.
export function useCompanyName() {
    return useAuthStore((s) => s.companyName);
}
