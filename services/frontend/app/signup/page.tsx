import { SignUpForm } from "@/components/auth/Signup";

export default function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4">
      <SignUpForm />
    </div>
  );
}