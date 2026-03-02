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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center justify-around px-2">
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
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-strong-buy"
                  : "text-muted-foreground active:text-foreground"
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
