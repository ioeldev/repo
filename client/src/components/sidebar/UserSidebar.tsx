import * as React from "react";
import { Home, TrendingUp, List, Settings } from "lucide-react";

import { AppBranding } from "@/components/sidebar/AppBranding";
import { NavMain, type NavItem } from "@/components/sidebar/NavMain";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";
import { useGetMe } from "@/hooks/useAuth";

// Define user navigation items
const userNavItems: NavItem[] = [
    {
        title: "Dashboard",
        url: "/",
        icon: Home,
    },
    {
        title: "Trading",
        url: "/trading",
        icon: TrendingUp,
    },
    {
        title: "Positions",
        url: "/positions",
        icon: List,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
];

export function UserSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: me } = useGetMe();
    const user = me?.data?.user;

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <AppBranding name="Trading Platform" logo={TrendingUp} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={userNavItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={{
                        avatar: "https://i.pravatar.cc/150?img=3",
                        name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
                        email: user?.email || "",
                    }}
                />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
