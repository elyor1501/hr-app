"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between p-6">
        <h1 className="text-2xl font-bold ">HR App</h1>
        <button
          onClick={() => router.push("/login")}
          className=" bg-blue-600 text-white px-2 py-1 rounded-lg"
        >
          Sign In
        </button>
      </div>

      <div className="text-center mt-20">
        <h2 className="text-5xl font-bold">
          The Future of HR is <span className="text-blue-600">AI-Powered</span>
        </h2>

        <p className="mt-6 text-gray-600 max-w-xl mx-auto">
          Automate the process, resume screening and HR workflows using
          intelligent systems.
        </p>

        <div className="flex justify-center">
          <button
            onClick={() => router.push("/signup")}
            className="mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
