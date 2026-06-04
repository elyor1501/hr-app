"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignUpForm } from "@/components/auth/Signup";
import Image from "next/image";
import Logo from "@/app/(main)/VASPP_logo_black_text.png";
import { useUser } from "@/app/contexts/UserContext";

export default function Signup() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "admin") {
      setAllowed(true);
    } else {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !allowed) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute top-6 left-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md overflow-hidden bg-white p-1">
            <Image
              src={Logo}
              alt="VASPP Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="font-extrabold text-lg tracking-tight"
              style={{ color: "#429ABD" }}
            >
              VASPP
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-tight"
              style={{ color: "#F5A623" }}
            >
              HR Management System
            </span>
          </div>
        </div>
      </div>
      <SignUpForm />
    </div>
  );
}