"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { Briefcase, FileText, LayoutDashboard, Search, Users, ChevronRight, Sparkles, NotebookPen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Resumes", url: "/resumeList", icon: FileText },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Request", url: "/requests", icon: NotebookPen },
  { title: "Search", url: "/search", icon: Search },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r bg-white dark:bg-slate-950 transition-all duration-300 shadow-sm opacity-100">
      <SidebarHeader className="h-20 flex items-center justify-center border-b border-sidebar-border mb-4 px-4">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm transition-transform">
            <Sparkles className="text-primary-foreground w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-bold text-lg leading-none tracking-tight text-foreground">
                Smart HR
              </span>
              <span className="text-xs text-muted-foreground font-medium mt-1">
                Management System
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarMenu className="space-y-2">
          {items.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={isCollapsed ? item.title : undefined}>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-6 transition-all duration-300 group relative overflow-hidden",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm translate-x-1" 
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-1"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-300",
                          isActive ? "scale-110" : "group-hover:scale-110"
                        )} />
                        {!isCollapsed && (
                          <span className="font-semibold tracking-wide flex-1">{item.title}</span>
                        )}
                        {isActive && !isCollapsed && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-2" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="bg-primary text-primary-foreground font-semibold border-none shadow-md">
                      {item.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
