"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/index";

const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/assets/crypto/BTC", label: "Assets", icon: TrendingUp },
  { href: "/signals", label: "Signals", icon: Activity },
  { href: "/watchlist", label: "Watch", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-w-[44px] min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-strong-buy"
                  : "text-muted-foreground active:text-foreground active:bg-muted/50"
              )}
            >
              <tab.icon className="size-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
