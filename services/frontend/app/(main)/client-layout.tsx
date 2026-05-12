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
import { ChatButton } from "@/components/chats/ChatButton";
import { ChatInterface } from "@/components/chats/ChatInterface";
import { Separator } from "@/components/ui/separator";

type Props = {
  children: React.ReactNode;
  user: any;
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/resumeList": "Resume Management",
  "/candidates": "Candidate Directory",
  "/requests": "Requests",
  "/search": "Smart Search",
  "/jobs": "Job Postings",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/candidates/")) return "Candidate Insights";
  if (pathname.startsWith("/jobs/")) return "Role Description";
  if (pathname.startsWith("/requests/")) return "Request Description";
  return "HR Suite";
}

export default function ClientLayout({ children, user }: Props) {
  const pathname = usePathname();

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen={true} className="h-screen overflow-hidden">
        <AppSidebar />

        <SidebarInset className="flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
          <header className="h-16 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm z-30 sticky top-0 px-4 sm:px-6 transition-all duration-300">
            <div className="flex h-full items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="md:hidden shrink-0 h-8 w-8" />
                <Separator orientation="vertical" className="h-5 hidden md:block shrink-0" />
                <BackButton />
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground/90 truncate animate-in fade-in slide-in-from-left-4 duration-300">
                  {getPageTitle(pathname)}
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <ThemeSwitcher />
                <Separator orientation="vertical" className="h-6 hidden sm:block shrink-0" />
                <UserNav user={user} />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>

      {/* <ChatButton /> */}
      <ChatInterface />
    </ChatProvider>
  );
}
