"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function ServerPagination({
  currentPage,
  totalPages,
}: ServerPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingDir, setLoadingDir] = useState<"prev" | "next" | null>(null);

  const goToPage = (page: number, dir: "prev" | "next") => {
    setLoading(true);
    setLoadingDir(dir);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
    setTimeout(() => {
      setLoading(false);
      setLoadingDir(null);
    }, 2000);
  };

  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage - 1, "prev")}
        disabled={currentPage <= 1 || loading}
        className="hover:border-[#429ABD] hover:text-[#429ABD] transition-colors duration-300"
      >
        {loading && loadingDir === "prev" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowLeft />
        )}
      </Button>
      <span className="text-sm flex items-center gap-2" style={{ color: "#429ABD" }}>
        {loading && (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: "#429ABD" }} />
        )}
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage + 1, "next")}
        disabled={currentPage >= totalPages || loading}
        className="hover:border-[#429ABD] hover:text-[#429ABD] transition-colors duration-300"
      >
        {loading && loadingDir === "next" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight />
        )}
      </Button>
    </div>
  );
}