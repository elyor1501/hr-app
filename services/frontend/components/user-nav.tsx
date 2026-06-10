"use client";

import { useRouter } from "next/navigation";
import { LogOut, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useUser } from "@/app/contexts/UserContext";

type UserNavProps = {
  user: {
    email: string;
    full_name?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
};

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const { clearUser, user: contextUser } = useUser();

  const email = user?.email ?? "";
  const name =
    user?.full_name ||
    user?.user_metadata?.full_name ||
    email.split("@")[0] ||
    "User";

  const initials = name.substring(0, 2).toUpperCase();
  const isAdmin = contextUser?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expires_at");
    clearUser();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="relative h-8 w-8 rounded-full p-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="#" alt="Avatar" />
            <AvatarFallback>
              {user?.user_metadata?.full_name?.substring(0, 2).toUpperCase() ||
                initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            {isAdmin && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit"
                style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
              >
                Admin
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isAdmin && (
          <DropdownMenuItem
            onClick={() => router.push("/manage-users")}
            className="flex items-center cursor-pointer"
            style={{ color: "#429ABD" }}
          >
            <Users className="w-4 h-4 mr-3" />
            Manage Users
          </DropdownMenuItem>
        )}

        {isAdmin && <DropdownMenuSeparator />}

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center text-red-600 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}