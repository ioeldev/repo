import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { SyncLoader } from "react-spinners";
import { useGetMe, useIsAdmin } from "@/hooks/useAuth";

export const ProtectedRoutes = () => {
    const token = localStorage.getItem("access_token");
    const isImpersonating = localStorage.getItem("is_impersonating") === "true";
    const [isLoading, setIsLoading] = useState(!token);
    const { data: user, isLoading: isQueryLoading, error } = useGetMe(!!token);
    const isAdmin = useIsAdmin();
    
    useEffect(() => {
        if (!token) {
            setIsLoading(false);
        }
    }, [token]);

    if (isLoading || isQueryLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <SyncLoader color={"var(--color-primary)"} />
            </div>
        );
    }

    // Don't redirect admins to admin panel if they're impersonating
    if (isAdmin && !isImpersonating) {
        return <Navigate to="/admin" replace />;
    }

    if (!token || error || !user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
