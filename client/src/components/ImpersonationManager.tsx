import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

export const ImpersonationManager = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);
    const hasProcessed = useRef(false);

    useEffect(() => {
        // Prevent double processing
        if (hasProcessed.current) return;

        // Check for impersonation tokens in URL parameters
        const urlParams = new URLSearchParams(location.search);
        const accessToken = urlParams.get("access_token");
        const refreshToken = urlParams.get("refresh_token");
        const adminAccessToken = urlParams.get("admin_access_token");
        const adminRefreshToken = urlParams.get("admin_refresh_token");

        if (accessToken && refreshToken) {
            hasProcessed.current = true;
            setIsProcessing(true);

            console.log("Impersonation tokens detected in URL");

            // Store admin tokens if provided (for returning to admin panel)
            if (adminAccessToken && adminRefreshToken) {
                localStorage.setItem("admin_access_token", adminAccessToken);
                localStorage.setItem("admin_refresh_token", adminRefreshToken);
            }

            // Mark as impersonating
            localStorage.setItem("is_impersonating", "true");

            // Set the impersonated user's tokens
            localStorage.setItem("access_token", accessToken);
            localStorage.setItem("refresh_token", refreshToken);

            // Clear query cache to ensure fresh data for impersonated user
            queryClient.clear();

            // Remove tokens from URL for security
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);

            console.log("Navigating to user dashboard as impersonated user");

            // Dispatch custom event to notify other components
            window.dispatchEvent(new Event("impersonationChanged"));

            // Navigate after a brief delay to ensure all state updates are complete
            setTimeout(() => {
                setIsProcessing(false);
                navigate("/dashboard", { replace: true });
            }, 100);
        }
    }, [location.search, navigate, queryClient]);

    // Show nothing while processing to prevent flash of wrong content
    if (isProcessing) {
        return null;
    }

    return <>{children}</>;
};
