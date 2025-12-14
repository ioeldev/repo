import { Navigate } from "react-router";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/login/LoginForm";
import { settingsService } from "@/services/api";

export default function Login() {
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

    // If user is already logged in, redirect to home
    const token = localStorage.getItem("access_token");

    useEffect(() => {
        const fetchLoginBackground = async () => {
            try {
                const response = await settingsService.getLoginBackground();
                if (response.success && response.data.value) {
                    const base64Data = response.data.value;
                    setBackgroundImage(`data:image/png;base64,${base64Data}`);
                }
            } catch (error) {
                console.error("Failed to fetch login background:", error);
            }
        };

        fetchLoginBackground();
    }, []);

    if (token) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    {/*<a href="#" className="flex items-center gap-2 font-medium">
                        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="size-4"
                            >
                                <path d="M3 2h18" />
                                <path d="M3 22h18" />
                                <path d="M3 7h18" />
                                <path d="M3 12h18" />
                                <path d="M3 17h18" />
                            </svg>
                        </div>
                        Yoda Trading
                    </a>*/}
                </div>
                <div className="flex flex-1 items-center justify-center w-full">
                    <div className="w-full max-w-lg">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                {backgroundImage ? (
                    <img
                        src={backgroundImage}
                        alt="Login background"
                        className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                    />
                ) : (
                    <div className="absolute inset-0 h-full w-full bg-linear-to-br from-primary/50 to-white" />
                )}
            </div>
        </div>
    );
}
