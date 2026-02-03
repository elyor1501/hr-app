import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Link href="/dashboard">
          <h2 className="text-2xl font-bold text-green-600 mt-20 cursor-pointer hover:underline">
            Welcome to AI Powered HR Application
          </h2>
        </Link>
      </div>
    </main>
  );
}
