"use client";
 
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
 
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
 
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };
 
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="hover:border-[#429ABD] hover:text-[#429ABD] transition-colors duration-300"
      >
        <ArrowLeft className="group-hover:text-[#429ABD]" />
      </Button>
      <span className="text-sm" style={{ color: '#429ABD' }}>
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="hover:border-[#429ABD] hover:text-[#429ABD] transition-colors duration-300"
      >
        <ArrowRight className="group-hover:text-[#429ABD]" />
      </Button>
    </div>
  );
}