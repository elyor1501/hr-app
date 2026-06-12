import { ForgotPasswordForm } from "@/components/auth/ForgotPassword";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/app/(main)/VASPP_logo_black_text.png";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute top-6 left-6 flex items-center gap-4">
        <Link href="/login">
          <ArrowLeft className="w-4 h-4" style={{ color: "#429ABD" }} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden p-1">
            <Image
              src={Logo}
              alt="VASPP Logo"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-2xl font-black tracking-wider"
              style={{
                color: "#429ABD",
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              VASPP
            </span>
            <span
              className="text-[12px] font-bold uppercase tracking-tight"
              style={{ color: "#F5A623" }}
            >
              Resource Management System
            </span>
          </div>
        </div>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
