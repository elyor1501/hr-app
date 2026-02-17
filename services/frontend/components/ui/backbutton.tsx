"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  const handleBackClick = () => {
    router.back();
  };

  if (pathname === "/dashboard") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBackClick}
      aria-label="Go back"
      className="hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
