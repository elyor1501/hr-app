"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Lightbulb, Shield, Eye, Users } from "lucide-react";
import Image from "next/image";
import Logo from "@/app/(main)/VASPP_logo_black_text.png";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export default function LandingPage() {
  return (
    <div
      className="min-h-screen w-full font-sans selection:bg-[#429ABD20] dark:selection:bg-[#F5A62320]
      bg-white text-slate-900 
      dark:bg-[#020617] dark:text-slate-100"
    >
      <div className="pt-6 px-4 max-w-5xl mx-auto flex justify-center">
        <nav
          className="flex items-center justify-between w-full rounded-full px-6 py-3 shadow-sm
          bg-white border border-slate-200
          dark:bg-slate-900 dark:border-slate-700"
        >
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
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

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-full border hidden sm:block"
              style={{
                color: "#429ABD",
                borderColor: "#429ABD",
                backgroundColor: "transparent",
              }}
            >
              Sign in
            </Link>
          </div>
        </nav>
      </div>

      <main className="max-w-6xl mx-auto px-6 pt-8 pb-8 flex flex-col items-center text-center">
        <div className="relative w-full max-w-3xl h-[400px] mb-12 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1="10%"
              y1="50%"
              x2="50%"
              y2="50%"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="2"
            />
            <line
              x1="20%"
              y1="25%"
              x2="50%"
              y2="50%"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="2"
            />
            <line
              x1="30%"
              y1="60%"
              x2="50%"
              y2="50%"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="2"
            />
            <line
              x1="70%"
              y1="30%"
              x2="50%"
              y2="50%"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="2"
            />
            <line
              x1="95%"
              y1="50%"
              x2="50%"
              y2="50%"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="2"
            />
            <line
              x1="75%"
              y1="80%"
              x2="50%"
              y2="50%"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="2"
            />
          </svg>

          <div
            className="relative z-10 w-32 h-32 rounded-[2rem] shadow-xl flex items-center justify-center"
            style={{ backgroundColor: "#429ABD" }}
          >
            <div className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
              <Check className="w-8 h-8 text-white stroke-[3]" />
            </div>
          </div>

          <div
            className="absolute top-[15%] left-[20%] w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center"
            style={{ backgroundColor: "#F5A623" }}
          >
            <Lightbulb className="w-8 h-8 text-white" />
          </div>

          <div className="absolute top-[40%] left-[5%] w-24 h-24 rounded-3xl shadow-xl flex items-center justify-center bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <Users className="w-12 h-12" style={{ color: "#429ABD" }} />
          </div>

          <div
            className="absolute bottom-[20%] left-[25%] w-20 h-20 rounded-[1.5rem] shadow-lg flex items-center justify-center"
            style={{ backgroundColor: "#429ABD" }}
          >
            <div className="w-8 h-10 bg-white/30 rounded-t-full rounded-b-xl relative">
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[2px] h-4 bg-white/30" />
            </div>
          </div>

          <div
            className="absolute top-[20%] right-[25%] w-20 h-20 rounded-[1.5rem] shadow-lg flex items-center justify-center"
            style={{ backgroundColor: "#F5A623" }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>

          <div className="absolute top-[40%] right-[5%] w-24 h-24 rounded-3xl shadow-xl flex items-center justify-center bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <Eye className="w-10 h-10" style={{ color: "#429ABD" }} />
          </div>

          <div className="absolute bottom-[10%] right-[25%] w-16 h-16 rounded-2xl shadow-lg border-2 flex items-center justify-center bg-slate-200 border-white dark:bg-slate-700 dark:border-slate-900">
            <Users className="w-8 h-8" style={{ color: "#429ABD" }} />
          </div>
        </div>

        <h1 className="text-5xl md:text-[4.5rem] font-bold tracking-tight leading-[1.1] mb-6 max-w-4xl text-slate-900 dark:text-white">
          All-in-one HR <br /> platform
        </h1>

        <p className="text-lg md:text-xl mb-10 max-w-2xl font-medium text-slate-500 dark:text-slate-400">
          VASPP is a modern, all-in-one HR platform designed to perfectly fit
          your business needs.
        </p>

        <Link href="/login">
          <Button
            className="text-lg font-medium px-10 py-7 rounded-2xl shadow-sm"
            style={{ backgroundColor: "#429ABD", color: "white" }}
          >
            Get Started
          </Button>
        </Link>
      </main>
    </div>
  );
}
