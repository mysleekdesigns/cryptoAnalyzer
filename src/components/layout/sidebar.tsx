"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/index";
import { useUIStore } from "@/lib/store/ui-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets/crypto/BTC", label: "Assets", icon: TrendingUp },
  { href: "/signals", label: "Signals", icon: Activity },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300 ease-in-out",
          "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Brand */}
        <div className="relative flex h-14 items-center gap-2 px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-strong-buy to-chart-volume font-mono text-xs font-bold text-white">
            CA
          </div>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight text-foreground transition-all duration-300",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            CryptoAnalyzer
          </span>
        </div>

        <Separator className="opacity-50" />

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/[0.08] text-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-strong-buy" />
                )}
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? "text-strong-buy"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-all duration-300",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border/50 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full justify-center text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
