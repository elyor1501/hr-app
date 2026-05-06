import { LoginForm } from "@/components/auth/Login";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Login() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 
      bg-gradient-to-br from-indigo-50 via-white to-blue-50 
      dark:from-gray-900 dark:via-gray-950 dark:to-gray-900"
    >
      <div className="absolute top-6 left-6 flex items-center gap-4">
        <Link href="/">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2 group">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
            <Sparkles className="text-white w-5 h-5" />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
              Smart HR
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
              Management System
            </span>
          </div>
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
