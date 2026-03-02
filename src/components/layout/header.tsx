"use client";

import { LogOut, Menu, Moon, Search, Settings, Sun, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils/index";
import { useUIStore } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl transition-all duration-300",
        collapsed ? "md:pl-20" : "md:pl-64"
      )}
    >
      {/* Mobile menu button - hidden on desktop */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search assets, signals..."
          className="h-8 bg-muted/50 pl-8 text-sm border-transparent focus-visible:border-border"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="User menu"
            >
              <Avatar size="sm">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-chart-volume to-strong-buy text-white">
                  U
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs text-muted-foreground">user@example.com</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut()}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
