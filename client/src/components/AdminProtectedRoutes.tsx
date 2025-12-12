import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { SyncLoader } from "react-spinners";
import { useGetMe } from "@/hooks/useAuth";

export const AdminProtectedRoutes = () => {
    const token = localStorage.getItem("access_token");
    const isImpersonating = localStorage.getItem("is_impersonating") === "true";
    const [isLoading, setIsLoading] = useState(!token);
    const { data: me, isLoading: isQueryLoading, error } = useGetMe(!!token);
    const isAdmin = ["admin", "superadmin"].includes(me?.data?.user?.role || "");

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

    // If impersonating, don't allow access to admin routes
    // (the impersonated user should only see user routes)
    if (isImpersonating) {
        return <Navigate to="/dashboard" replace />;
    }

    if (!token || error || !me?.data?.user || !isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
