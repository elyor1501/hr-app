import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { Briefcase, FileText, Home, LucideIcon, Search, Users } from "lucide-react";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
}

type Props = {
  isOpen: boolean;
};

const items: SidebarItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Resumes List", url: "/resumeList", icon: FileText },
  { title: "Employees", url: "/candidates", icon: Users },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Search", url: "/search", icon: Search },
];

export function AppSidebar({ isOpen }: Props) {
  const pathname = usePathname();
  return (
    <Sidebar className="relative">
      <SidebarContent>
       
        <div className="flex items-center justify-center h-14">
          <span className="font-semibold">
            {isOpen ? "HR Application" : "HR"}
          </span>
        </div>

        <SidebarMenu className="px-2">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a
                  href={item.url}
                  data-active={pathname === item.url}
                  className="flex items-center gap-3 rounded-md px-3 py-2
                  hover:bg-muted data-[active=true]:bg-muted"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {isOpen && <span>{item.title}</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
