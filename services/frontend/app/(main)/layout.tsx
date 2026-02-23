"use client";

import { useEffect, useState } from "react";
import { getLoggedInUser } from "@/lib/users/data";
import ClientLayout from "./client-layout";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const data = await getLoggedInUser();
      setUser(data);
    }
    fetchUser();
  }, []);

  return <ClientLayout user={user}>{children}</ClientLayout>;
}
