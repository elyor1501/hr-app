"use client";

import Link from "next/link";
import { LogOut} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar,AvatarImage, AvatarFallback } from "./ui/avatar";

type UserNavProps = {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
};

export function UserNav({ user }: UserNavProps) {
  const email = user?.email ?? "";
  const name = email.split("@")[0] || "User";
  const initials = name.substring(0, 2).toUpperCase();

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
            <p className="text-xs text-muted-foreground">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/login" className="flex items-center text-red-600">
            <LogOut className="w-4 h-4 mr-3" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
