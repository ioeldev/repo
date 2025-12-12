import * as React from "react";
import { Home, Package } from "lucide-react";

import { AppBranding } from "@/components/sidebar/AppBranding";
import { NavMain, type NavItem } from "@/components/sidebar/NavMain";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";

// Define your navigation items here
const navItems: NavItem[] = [
    {
        title: "Dashboard",
        url: "/",
        icon: Home,
    },
    // Add more items as needed:
    // {
    //     title: "Products",
    //     url: "/products",
    //     icon: Package,
    // },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <AppBranding name="Your App" logo={Package} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={{
                        avatar: "https://i.pravatar.cc/150?img=3",
                        name: "Jane Doe",
                        email: "janedoe@gmail.com",
                    }}
                />
            </SidebarFooter>
            <SidebarRail />
            <SidebarRail />
        </Sidebar>
    );
}
