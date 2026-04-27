"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/ui/backbutton";
import { UserNav } from "@/components/user-nav";
import { ChatProvider } from "@/app/contexts/ChatContext";
import { ChatButton } from "@/components/chats/ChatButton";
import { ChatInterface } from "@/components/chats/ChatInterface";

type Props = {
  children: React.ReactNode;
  user: any;
};

export default function ClientLayout({ children, user }: Props) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Dashboard Overview";
    if (pathname.startsWith("/resumeList")) return "Resume Management";
    if (pathname === "/candidates") return "Candidate Directory";
    if (pathname.startsWith("/candidates/")) return "Candidate Insights";
    if (pathname === "/jobs") return "Job Postings";
    if (pathname.startsWith("/jobs/")) return "Role Description";
    if (pathname === "/requests") return "Requests";
    if (pathname.startsWith("/requests/")) return "Request Description";
    if (pathname === "/search") return "Smart Search";
    return "HR Suite";
  };

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <AppSidebar />
          
          <SidebarInset className="flex overflow-hidden bg-slate-50/50 dark:bg-slate-950/50" style={{ marginLeft: "13rem" }} >
            <header className="h-20 border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm z-30 sticky top-0 px-6 transition-all duration-300">
              <div className="flex h-full items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* <SidebarTrigger className="h-9 w-9 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors" /> */}
                  <div className="h-6 w-[px] bg-border/40 mx-1 hidden md:block" />
                  <BackButton />
                  <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <h1 className="text-xl font-bold tracking-tight text-foreground/90">
                      {getPageTitle()}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden lg:flex items-center bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-xs font-semibold text-primary tracking-widest uppercase">System Online</span>
                  </div>
                  <ThemeSwitcher />
                  <div className="h-8 w-[1px] bg-border mx-1" />
                  <UserNav user={user} />
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar relative">
              <div className="container max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <ChatButton />
      <ChatInterface />
    </ChatProvider>
  );
}
