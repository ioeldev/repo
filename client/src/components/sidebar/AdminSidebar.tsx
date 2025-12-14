import * as React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  Settings,
  TrendingUp,
  ArrowLeftRight,
} from "lucide-react";

import { AppBranding } from "@/components/sidebar/AppBranding";
import { NavMain, type NavItem } from "@/components/sidebar/NavMain";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";
import { useGetMe, useIsAdmin } from "@/hooks/useAuth";

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  const { data: me } = useGetMe();
  const isAdmin = useIsAdmin();

  const user = me?.data?.user;

  // Define admin navigation items with translations
  const adminNavItems: NavItem[] = useMemo(() => [
    {
      title: t("admin.sidebar.users"),
      url: "/admin/users",
      icon: Users,
    },
    {
      title: t("admin.sidebar.positions"),
      url: "/admin/positions",
      icon: TrendingUp,
    },
    {
      title: t("admin.sidebar.depositsWithdraws"),
      url: "/admin/deposits-withdraws",
      icon: ArrowLeftRight,
    },
    {
      title: t("admin.sidebar.settings"),
      url: "/admin/settings",
      icon: Settings,
    },
  ], [t]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppBranding
          name={t("admin.sidebar.adminPanel")}
          logo={LayoutDashboard}
          href={isAdmin ? "/admin/users" : "/"}
        />
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
