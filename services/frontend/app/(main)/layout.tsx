"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/lib/users/data";
import ClientLayout from "./client-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const data = await getLoggedInUser();

      if (!data) {
        router.replace("/login");
        return;
      }

      setUser(data);
      setLoading(false);
    }

    fetchUser();
  }, [router]);

  if (loading) return null;

  return <ClientLayout user={user}>{children}</ClientLayout>;
}
