import { Route, Routes } from "react-router";
import { UserLayout } from "./layouts/user-layout";
import { AdminLayout } from "./layouts/admin-layout";
import UserDashboard from "./pages/user/dashboard";
import Trading from "./pages/user/trading";
import Positions from "./pages/user/positions";
import UserSettings from "./pages/user/settings";
// import AdminDashboard from "./pages/admin/dashboard";
import AdminUsers from "./pages/admin/users";
import AdminPositions from "./pages/admin/positions";
import AdminDepositsWithdraws from "./pages/admin/deposits-withdraws";
import AdminRobots from "./pages/admin/robots";
import AdminSettings from "./pages/admin/settings";
import Login from "./pages/login";
import { ProtectedRoutes } from "./components/ProtectedRoutes";
import { AdminProtectedRoutes } from "./components/AdminProtectedRoutes";
import { RootRedirect } from "./components/RootRedirect";
import { ThemeProvider } from "@/components/theme-provider";
import { ImpersonationManager } from "./components/ImpersonationManager";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { useIsImpersonating } from "./hooks/useImpersonation";
import { Toaster } from "./components/ui/sonner";

function App() {
  const isImpersonating = useIsImpersonating();

  return (
    <ThemeProvider storageKey="vite-ui-theme">
      <ImpersonationManager>
        <ImpersonationBanner />
        <div className={isImpersonating ? "pt-12" : ""}>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Admin Routes - Must come first to avoid conflict with user routes */}
            <Route element={<AdminProtectedRoutes />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminUsers />} />
                {/* <Route path="dashboard" element={<AdminDashboard />} /> */}
                <Route path="users" element={<AdminUsers />} />
                <Route path="positions" element={<AdminPositions />} />
                <Route
                  path="deposits-withdraws"
                  element={<AdminDepositsWithdraws />}
                />
                {/*<Route path="robots" element={<AdminRobots />} />*/}
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            {/* User Routes */}
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<UserLayout />}>
                <Route index element={<RootRedirect />} />
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="trading" element={<Trading />} />
                <Route path="positions" element={<Positions />} />
                <Route path="settings" element={<UserSettings />} />
              </Route>
            </Route>
          </Routes>
          <Toaster />
        </div>
      </ImpersonationManager>
    </ThemeProvider>
  );
}

export default App;
