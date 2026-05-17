"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
  ChevronLeft,
  FileSearch,
  Handshake,
  Kanban,
  Mail,
  Radar,
  Settings,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  { type: "separator" as const, label: "ORIGINATION" },
  {
    label: "Scanner",
    href: "/scanner",
    icon: Radar,
  },
  {
    label: "Sourcing",
    href: "/sourcing",
    icon: Target,
  },
  {
    label: "Outreach",
    href: "/outreach",
    icon: Mail,
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: Kanban,
  },
  {
    label: "Relationships",
    href: "/relationships",
    icon: Users,
  },
  {
    label: "Meetings",
    href: "/meetings",
    icon: Calendar,
  },
  { type: "separator" as const, label: "INTELLIGENCE" },
  {
    label: "Advisory",
    href: "/advisory",
    icon: FileSearch,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const navContent = (
    <nav className="flex-1 overflow-y-auto p-2">
      <div className="space-y-1">
        {NAV_ITEMS.map((item, i) => {
          if ("type" in item && item.type === "separator") {
            return (
              <div key={i} className="py-2">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {item.label}
                </p>
              </div>
            );
          }

          const navItem = item as {
            label: string;
            href: string;
            icon: React.ComponentType<{ className?: string }>;
          };
          const Icon = navItem.icon;
          const isActive =
            pathname === navItem.href ||
            (navItem.href !== "/dashboard" &&
              pathname.startsWith(navItem.href));

          return (
            <div key={navItem.href}>
              <Link
                href={navItem.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{navItem.label}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
    {/* Mobile sidebar (Sheet) */}
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent side="left" className="w-64 p-0 bg-card border-border/50 md:hidden">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 items-center border-b border-border/50 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              Asset Algorithm
            </span>
          </Link>
        </div>
        {navContent}
        <div className="border-t border-border/50 p-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>

    {/* Desktop sidebar */}
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border/50 bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              Asset Algorithm
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={toggleSidebar}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              sidebarCollapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {NAV_ITEMS.map((item, i) => {
            if ("type" in item && item.type === "separator") {
              return (
                <div key={i} className="py-2">
                  {!sidebarCollapsed && (
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {item.label}
                    </p>
                  )}
                  {sidebarCollapsed && <Separator className="mx-auto w-8" />}
                </div>
              );
            }

            const navItem = item as {
              label: string;
              href: string;
              icon: React.ComponentType<{ className?: string }>;
            };
            const Icon = navItem.icon;
            const isActive =
              pathname === navItem.href ||
              (navItem.href !== "/dashboard" &&
                pathname.startsWith(navItem.href));

            const linkContent = (
              <Link
                href={navItem.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  sidebarCollapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{navItem.label}</span>}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={navItem.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {navItem.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={navItem.href}>{linkContent}</div>;
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border/50 p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </Link>
          </TooltipTrigger>
          {sidebarCollapsed && (
            <TooltipContent side="right" sideOffset={8}>
              Settings
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
    </>
  );
}
