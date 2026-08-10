import { Outlet, useNavigate } from "react-router-dom";
import PosNavbar from "./PosNavbar";
import PosSidebar from "./PosSidebar";
import { useAuth } from "../../features/auth/AuthContext";
import { ROUTES } from "../../routes";
import usePosStore from "../features/pos/stores/posStore";
import { usePosSession } from "../hooks/usePosSession";
import "../index.css";

function DashboardLayout() {
    const { logout: mainLogout } = useAuth();
    const navigate = useNavigate();
    const cashSessionOpen = usePosStore((state) => state.cashSessionOpen);

    usePosSession();

    // Same session as the main app now — logging out here logs out there
    // too, and lands back on the main app's own /login.
    const logout = () => {
        mainLogout();
        navigate(ROUTES.login);
    };

    return (
        <div className="pos-app h-screen flex flex-col overflow-hidden">
            <PosNavbar />
            <div className="flex flex-1 overflow-hidden">
                <PosSidebar onLogout={logout} />
                <div
                    className={`flex-1 min-h-0 soft-scrollbar pt-2 pb-2 pl-2 pr-2 bg-white dark:bg-gray-950 ${
                        cashSessionOpen ? "overflow-y-auto" : "overflow-hidden"
                    }`}
                    onWheel={cashSessionOpen ? undefined : (e) => e.preventDefault()}
                    onTouchMove={cashSessionOpen ? undefined : (e) => e.preventDefault()}
                >
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default DashboardLayout;
