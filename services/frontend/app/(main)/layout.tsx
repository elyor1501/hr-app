"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/ui/backbutton";
import { SidebarToggle } from "@/components/ui/sidebar-toggle";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { ChatProvider } from "../contexts/ChatContext";
import { ChatButton } from "@/components/chats/ChatButton";
import { ChatInterface } from "@/components/chats/ChatInterface";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebarToggle();

  const getPageTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Dashboard";
    if (pathname.startsWith("/resumeList")) return "Resumes";
    if (pathname === "/candidates") return "Employees";
    if (pathname.startsWith("/candidates/")) return "Employee Details";
    if (pathname === "/jobs") return "Jobs";
    if (pathname.startsWith("/jobs/")) return "Job Details";
    return "HR App";
  };

  return (
    <ChatProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <div
            className={`hidden md:block relative border-r bg-white dark:bg-gray-900
          transition-all duration-300 ${isOpen ? "w-60" : "w-16"}`}
          >
            <AppSidebar isOpen={isOpen} />
            <div className="absolute -right-0 top-0 z-50">
              <SidebarToggle isOpen={isOpen} setIsOpen={setIsOpen} />
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <header className="h-14 border-b bg-white shadow-sm dark:bg-gray-800">
              <div className="flex h-full items-center justify-between px-4">
                <SidebarTrigger className="md:hidden" />
                <div className="flex items-center gap-2">
                  <BackButton />
                  <h1 className="font-semibold">{getPageTitle()}</h1>
                </div>
                <ThemeSwitcher />
              </div>
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      <ChatButton />
      <ChatInterface />
    </ChatProvider>
  );
}
