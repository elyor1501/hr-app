"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/ui/backbutton";
import { UserNav } from "@/components/user-nav";
import { ChatProvider } from "@/app/contexts/ChatContext";
import { ChatInterface } from "@/components/chats/ChatInterface";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  user: any;
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/resumeList": "Resume Management",
  "/candidates": "Candidate Directory",
  "/requests": "Requests Management",
  "/search": "Smart Search",
  "/jobs": "Job Postings",
  "/manage-users": "Manage Users",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/candidates/")) return "Candidate Insights";
  if (pathname.startsWith("/jobs/")) return "Role Description";
  if (pathname.startsWith("/requests/")) return "Request Description";
  return "RM Suite";
}

export default function ClientLayout({ children, user }: Props) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const titleColor = mounted && theme === "dark" ? "#F5A623" : "#429ABD";

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen={true} className="h-screen overflow-hidden">
        <AppSidebar />

        <SidebarInset className="flex flex-col overflow-hidden relative">
          {/* Light brand color background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Top right corner - Blue glow */}
            <div
              className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: "#429ABD" }}
            />
            {/* Bottom left corner - Orange glow */}
            <div
              className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15"
              style={{ background: "#F5A623" }}
            />
            {/* Center subtle gradient */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-5"
              style={{
                background: "radial-gradient(circle, #429ABD 0%, #F5A623 100%)",
              }}
            />
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col h-full">
            <header className="h-14 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm z-30 sticky top-0 px-4 sm:px-6 transition-all duration-300">
              <div className="flex h-full items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SidebarTrigger className="shrink-0 h-8 w-8" />
                  <Separator
                    orientation="vertical"
                    className="h-5 hidden md:block shrink-0"
                  />
                  <BackButton />
                  <h1
                    className="text-base sm:text-xl font-bold tracking-tight truncate animate-in fade-in slide-in-from-left-4 duration-300"
                    style={{ color: titleColor }}
                  >
                    {getPageTitle(pathname)}
                  </h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <ThemeSwitcher />
                  <Separator
                    orientation="vertical"
                    className="h-6 hidden sm:block shrink-0"
                  />
                  <UserNav user={user} />
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
              <div className="w-full px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-1 space-y-0.5 sm:space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {children}
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ChatInterface />
    </ChatProvider>
  );
}
