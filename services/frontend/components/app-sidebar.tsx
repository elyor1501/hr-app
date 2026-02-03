import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { Home, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const items: SidebarItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Resume List", url: "/resumeList", icon: Inbox },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar className="fixed inset-y-0 left-0 w-[var(--sidebar-width)] border-r shadow-md">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex justify-center">
            <h1 className="text-base font-semibold">HR Application</h1>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <nav aria-label="Main navigation">
            <SidebarMenu className="mt-4">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      data-active={pathname === item.url}
                      className="flex w-full items-center gap-6 rounded-md px-3 py-2 transition-colors
                      hover:bg-muted focus:bg-muted data-[active=true]:bg-muted"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
