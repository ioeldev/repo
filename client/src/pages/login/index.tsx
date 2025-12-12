import { Navigate } from "react-router";
import { LoginForm } from "@/components/login/LoginForm";

export default function Login() {
    // If user is already logged in, redirect to home
    const token = localStorage.getItem("access_token");
    if (token) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    );
}
