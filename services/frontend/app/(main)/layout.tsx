"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";
import ClientLayout from "./client-layout";

function AuthSkeleton() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <div className="hidden md:flex w-64 shrink-0 border-r border-border/40 bg-background/95 flex-col p-4 gap-4">
        <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 shrink-0 border-b border-border/40 bg-background/80 px-6 flex items-center gap-4">
          <div className="h-5 w-36 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1" />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="flex-1 p-6 sm:p-8 space-y-4">
          <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-80 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, [pathname]);

  if (loading) return <AuthSkeleton />;

  if (!user) return null;

  return <ClientLayout user={user}>{children}</ClientLayout>;
}