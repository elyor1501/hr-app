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
import {
  FileText,
  LayoutDashboard,
  Search,
  Users,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Logo from "@/app/(main)/VASPP_logo_black_text.png";

const items = [
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Resumes", url: "/resumeList", icon: FileText },
  { title: "Request", url: "/requests", icon: NotebookPen },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  // { title: "Jobs", url: "/jobs", icon: Briefcase }, 
  { title: "Search & Filter", url: "/search", icon: Search },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, openMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  // On mobile, show text when sidebar is open (openMobile is true)
  // On desktop, show text when not collapsed
  const showText = isMobile ? openMobile : !isCollapsed;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 bg-background/95 backdrop-blur-sm transition-all duration-300 z-40"
      style={{ 
        "--sidebar-width-icon": "5rem" 
      } as React.CSSProperties}
    >
      <SidebarHeader className="h-20 flex items-center justify-center border-b border-border/40 mb-4 px-4 bg-background/50">
        <div className={cn(
          "flex items-center w-full overflow-hidden",
          showText ? "justify-start gap-3" : "justify-center"
        )}>
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 overflow-hidden bg-white p-1">
            <Image
              src={Logo}
              alt="VASPP Logo"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          {showText && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-3 duration-300">
              <span className="font-extrabold text-xl leading-none tracking-tight" style={{ color: '#429ABD' }}>
                VASPP
              </span>
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter" style={{ color: '#F5A623' }}>
                HR Management System
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarMenu className="space-y-2">
          {items.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url !== "/" && pathname.startsWith(item.url + "/"));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-6 transition-all duration-200 group relative overflow-hidden",
                      showText ? "justify-start gap-3" : "justify-center",
                      isActive
                        ? "shadow-sm translate-x-1"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-1"
                    )}
                    style={isActive ? { 
                      backgroundColor: '#F5A62320',
                      color: '#F5A623'
                    } : {}}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-200",
                        isActive ? "scale-110" : "group-hover:scale-110"
                      )}
                      style={!isActive ? { color: '#429ABD' } : isActive ? { color: '#F5A623' } : {}}
                    />
                    {showText && (
                      <span className="font-semibold tracking-wide flex-1">
                        {item.title}
                      </span>
                    )}
                    {isActive && showText && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] ml-2" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}