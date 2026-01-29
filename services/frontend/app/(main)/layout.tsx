"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-h-screen flex-col md:pl-[var(--sidebar-width)]">
          <header className="h-14 border-b shadow-sm bg-white dark:bg-gray-800">
            <div className="flex h-full items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-base font-semibold">
                  Welcome to HR Application
                </h1>
              </div>
              <ThemeSwitcher />
            </div>
          </header>
          <main className="flex-1 bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
