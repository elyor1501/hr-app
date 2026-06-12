"use client";

import { useRouter } from "next/navigation";
import { Link, LogOut, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useUser } from "@/app/contexts/UserContext";

type UserNavProps = {
  user: {
    email: string;
    full_name?: string;
    role?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
};

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const { clearUser, user: currentUser } = useUser();

  const isAdmin =
    currentUser?.role === "admin" || user?.role === "admin";

  const email = user?.email ?? "";
  const name =
    user?.full_name ||
    user?.user_metadata?.full_name ||
    email.split("@")[0] ||
    "User";

  const initials = name.substring(0, 2).toUpperCase();

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
        <Button variant="outline" className="relative h-8 w-8 rounded-full p-0">
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
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{name}</p>

              {isAdmin && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
                >
                  Admin
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isAdmin && (
          <>
            {/* { <DropdownMenuItem
              onClick={() => router.push("/manage-users")}
              className="flex items-center cursor-pointer"
            >
              <Users className="w-4 h-4 mr-3" />
              Manage Users
            </DropdownMenuItem> } */}
            <DropdownMenuItem
              onClick={() => router.push("/signup")}
              className="flex items-center cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-3" />
              Invite User
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}

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