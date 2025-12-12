import * as React from "react";
import { LayoutDashboard, Users, Settings, Zap, TrendingUp } from "lucide-react";

import { AppBranding } from "@/components/sidebar/AppBranding";
import { NavMain, type NavItem } from "@/components/sidebar/NavMain";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";
import { useGetMe, useIsAdmin } from "@/hooks/useAuth";

// Define admin navigation items
const adminNavItems: NavItem[] = [
    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
    },
    {
        title: "Positions",
        url: "/admin/positions",
        icon: TrendingUp,
    },
    {
        title: "Robots",
        url: "/admin/robots",
        icon: Zap,
    },
    {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
    },
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: me } = useGetMe();
    const isAdmin = useIsAdmin();

    const user = me?.data?.user;

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <AppBranding name="Admin Panel" logo={LayoutDashboard} href={isAdmin ? "/admin/users" : "/"} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={adminNavItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={{
                        avatar: "https://i.pravatar.cc/150?img=1",
                        name: `${user?.first_name} ${user?.last_name}`,
                        email: user?.email || "",
                    }}
                />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
