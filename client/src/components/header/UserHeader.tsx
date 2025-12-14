import { Menu, DollarSign, Euro } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLogout, useUserInfo } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../theme-provider";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "Trading", url: "/trading" },
  { title: "Positions", url: "/positions" },
];

export function UserHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const logout = useLogout();
  const { fullName, email } = useUserInfo();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  const isActive = (url: string) => location.pathname === url;

  return (
    <header className="bg-card/80 backdrop-blur-xl supports-backdrop-filter:bg-card/60 shadow-sm">
      <div className="container max-w-full px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Navigation Left Side */}
          <div className="flex items-center gap-6">
            {/* Logo/Brand */}
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-lg shrink-0"
            >
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
                Y
              </div>
              <span className="hidden sm:inline text-foreground">Yoda</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-1 lg:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  {menuItems.map((item) => (
                    <NavigationMenuItem key={item.title}>
                      <NavigationMenuLink
                        asChild
                        className={`group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all ${
                          isActive(item.url)
                            ? "text-text-link"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Link to={item.url}>{item.title}</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </nav>
          </div>

          {/* Right side - User Menu & Mobile Trigger */}
          <div className="flex items-center gap-2">
            {/* Desktop User Menu */}
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gap-2 cursor-pointer hover:bg-background"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} alt={fullName} />
                      <AvatarFallback>
                        {fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    {/*<DropdownMenuLabel className="flex items-center gap-4">*/}
                    <Link
                      to="/settings"
                      className="flex items-center gap-4 cursor-pointer"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={undefined} alt={fullName} />
                        <AvatarFallback>
                          {fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold">{fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {email}
                        </div>
                      </div>
                    </Link>
                    {/*</DropdownMenuLabel>*/}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs">
                      Theme
                    </DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={theme === "light"}
                      onCheckedChange={() => setTheme("light")}
                    >
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={theme === "dark"}
                      onCheckedChange={() => setTheme("dark")}
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={theme === "system"}
                      onCheckedChange={() => setTheme("system")}
                    >
                      <Monitor className="mr-2 h-4 w-4" />
                      System
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs">
                      Currency
                    </DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={currency === "USD"}
                      onCheckedChange={() => setCurrency("USD")}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      USD ($)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={currency === "EUR"}
                      onCheckedChange={() => setCurrency("EUR")}
                    >
                      <Euro className="mr-2 h-4 w-4" />
                      EUR (€)
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 py-6">
                  {/* Mobile User Info */}
                  <div className="flex items-center gap-3 px-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={undefined} alt={fullName} />
                      <AvatarFallback>
                        {fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold">{fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {email}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col gap-2">
                    {menuItems.map((item) => (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive(item.url)
                            ? "text-text-link"
                            : "hover:text-text-link"
                        }`}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </nav>

                  <div className="h-px bg-border" />

                  {/* Mobile Settings & Logout */}
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:text-text-link",
                        isActive("/settings") && "text-text-link",
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Mobile Theme Toggle */}
                  <div className="flex flex-col gap-2">
                    <p className="px-3 py-2 text-xs font-semibold text-muted">
                      Theme
                    </p>
                    <div className="flex flex-col gap-1 px-3">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                          theme === "light"
                            ? "text-text-link"
                            : "hover:text-text-link"
                        }`}
                      >
                        <Sun className="h-4 w-4" />
                        Light
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                          theme === "dark"
                            ? "bg-primary/10 text-text-link"
                            : "hover:text-text-link"
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                          theme === "system"
                            ? "bg-primary/10 text-text-link"
                            : "hover:text-text-link"
                        }`}
                      >
                        <Monitor className="h-4 w-4" />
                        System
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Mobile Currency Toggle */}
                  <div className="flex flex-col gap-2">
                    <p className="px-3 py-2 text-xs font-semibold text-muted">
                      Currency
                    </p>
                    <div className="flex flex-col gap-1 px-3">
                      <button
                        onClick={() => setCurrency("USD")}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                          currency === "USD"
                            ? "bg-primary/10 text-text-link"
                            : "hover:text-text-link"
                        }`}
                      >
                        <DollarSign className="h-4 w-4" />
                        USD ($)
                      </button>
                      <button
                        onClick={() => setCurrency("EUR")}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                          currency === "EUR"
                            ? "bg-primary/10 text-text-link"
                            : "hover:text-text-link"
                        }`}
                      >
                        <Euro className="h-4 w-4" />
                        EUR (€)
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Mobile Logout */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
