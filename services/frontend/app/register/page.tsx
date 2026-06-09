import { RegisterForm } from "@/components/auth/Register";
import Image from "next/image";
import Logo from "@/app/(main)/VASPP_logo_black_text.png";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params?.token ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute top-6 left-6 flex items-center gap-4">
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
              className="font-extrabold text-lg tracking-tight"
              style={{ color: "#429ABD" }}
            >
              VASPP
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-tight"
              style={{ color: "#F5A623" }}
            >
              Resource Management System
            </span>
          </div>
        </div>
      </div>
      <RegisterForm token={token} />
    </div>
  );
}
