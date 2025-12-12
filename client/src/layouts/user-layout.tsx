import { Outlet } from "react-router";
import { UserHeader } from "@/components/header/UserHeader";

export function UserLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <UserHeader />
            <main className="flex-1">
                {/* <div className="container max-w-full px-4 md:px-6 lg:px-8 py-6"> */}
                <Outlet />
                {/* </div> */}
            </main>
        </div>
    );
}
