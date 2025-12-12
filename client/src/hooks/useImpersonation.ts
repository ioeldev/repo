import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to check if current session is in impersonation mode
 * Returns a reactive boolean that updates when impersonation state changes
 */
export const useIsImpersonating = () => {
    const [isImpersonating, setIsImpersonating] = useState(localStorage.getItem("is_impersonating") === "true");

    useEffect(() => {
        const checkImpersonation = () => {
            setIsImpersonating(localStorage.getItem("is_impersonating") === "true");
        };

        // Listen for custom event and storage changes
        window.addEventListener("impersonationChanged", checkImpersonation);
        window.addEventListener("storage", checkImpersonation);

        return () => {
            window.removeEventListener("impersonationChanged", checkImpersonation);
            window.removeEventListener("storage", checkImpersonation);
        };
    }, []);

    return isImpersonating;
};

/**
 * Hook to exit impersonation mode and return to admin session
 */
export const useExitImpersonation = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return () => {
        const adminAccessToken = localStorage.getItem("admin_access_token");
        const adminRefreshToken = localStorage.getItem("admin_refresh_token");

        if (adminAccessToken && adminRefreshToken) {
            // Restore admin tokens
            localStorage.setItem("access_token", adminAccessToken);
            localStorage.setItem("refresh_token", adminRefreshToken);

            // Clean up impersonation data
            localStorage.removeItem("admin_access_token");
            localStorage.removeItem("admin_refresh_token");
            localStorage.removeItem("is_impersonating");

            // Clear query cache
            queryClient.clear();

            // Dispatch custom event to notify other components
            window.dispatchEvent(new Event("impersonationChanged"));

            // Navigate back to admin
            navigate("/admin/users");
        }
    };
};
