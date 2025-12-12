import { Navigate } from "react-router";
import { SyncLoader } from "react-spinners";
import { useGetMe } from "@/hooks/useAuth";

/**
 * This component handles the smart redirect on "/" route
 * It checks the user's role and redirects to the appropriate dashboard
 * - admin/superadmin -> /admin/users
 * - user -> /dashboard
 */
export const RootRedirect = () => {
    const token = localStorage.getItem("access_token");
    const { data: me, isLoading, error } = useGetMe(true);

    // If no token, redirect to login (this should be caught by ProtectedRoutes, but as a safeguard)
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <SyncLoader color={"var(--color-chart-2)"} />
            </div>
        );
    }

    // Error or no user data
    if (error || !me?.data) {
        return <Navigate to="/login" replace />;
    }

    // Redirect based on role
    if (["admin", "superadmin"].includes(me?.data.user.role || "")) {
        return <Navigate to="/admin/users" replace />;
    }

    // Regular user
    return <Navigate to="/dashboard" replace />;
};
