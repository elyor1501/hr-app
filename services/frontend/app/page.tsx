"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Lightbulb, Shield, Eye, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-white text-slate-900 font-sans selection:bg-purple-100">
      {/* Floating Navbar */}
      <div className="pt-6 px-4 max-w-5xl mx-auto flex justify-center">
        <nav className="flex items-center justify-between w-full bg-white border border-slate-200 rounded-full px-6 py-3 shadow-sm">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm" />
            </div>
            SmartHR
          </div>

          {/* Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#" className="hover:text-slate-900 transition-colors">Product</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Features</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Resources</Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-200 rounded-full transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm px-6 rounded-full shadow-sm">
                Sign up
              </Button>
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-8 pb-8 flex flex-col items-center text-center">
        
        {/* Abstract Icon Network */}
        <div className="relative w-full max-w-3xl h-[400px] mb-12 flex items-center justify-center">
          
          {/* Connecting Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <line x1="10%" y1="50%" x2="50%" y2="50%" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="20%" y1="25%" x2="50%" y2="50%" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="30%" y1="60%" x2="50%" y2="50%" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="70%" y1="30%" x2="50%" y2="50%" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="95%" y1="50%" x2="50%" y2="50%" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="75%" y1="80%" x2="50%" y2="50%" stroke="#E2E8F0" strokeWidth="2" />
            {/* <line x1="90%" y1="50%" x2="80%" y2="30%" stroke="#E2E8F0" strokeWidth="2" /> */}
          </svg>

          {/* Central Icon */}
          <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-[2rem] shadow-xl flex items-center justify-center animate-in zoom-in duration-700">
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
              <Check className="w-8 h-8 text-white stroke-[3]" />
            </div>
          </div>

          {/* Surrounding Floating Icons */}
          
          {/* Top Left - Yellow */}
          <div className="absolute top-[15%] left-[20%] z-10 w-16 h-16 bg-yellow-300 rounded-2xl shadow-lg flex items-center justify-center animate-in slide-in-from-bottom-8 duration-700 delay-100">
             <Lightbulb className="w-8 h-8 text-yellow-800" />
          </div>

          {/* Bottom Left - Photo/Avatar (simulated with icon for now) */}
          <div className="absolute top-[40%] left-[5%] z-10 w-24 h-24 bg-white border border-slate-100 rounded-3xl shadow-xl flex items-center justify-center overflow-hidden animate-in slide-in-from-right-8 duration-700 delay-200">
             <Users className="w-12 h-12 text-slate-400" />
          </div>
          
          {/* Mid Bottom Left - Blue */}
          <div className="absolute bottom-[20%] left-[25%] z-10 w-20 h-20 bg-blue-400 rounded-[1.5rem] shadow-lg flex items-center justify-center animate-in slide-in-from-top-8 duration-700 delay-300">
             {/* Simple Balloon shape using CSS */}
             <div className="w-8 h-10 bg-white/30 rounded-t-full rounded-b-xl relative">
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[2px] h-4 bg-white/30" />
             </div>
          </div>

          {/* Top Right - Red/Coral Shield */}
          <div className="absolute top-[20%] right-[25%] z-10 w-20 h-20 bg-[#FF6B4A] rounded-[1.5rem] shadow-lg flex items-center justify-center animate-in slide-in-from-bottom-8 duration-700 delay-400">
             <Shield className="w-8 h-8 text-white" />
          </div>

          {/* Mid Right - White box with Eyes */}
          <div className="absolute top-[40%] right-[5%] z-10 w-24 h-24 bg-white border border-slate-100 rounded-3xl shadow-xl flex items-center justify-center animate-in slide-in-from-left-8 duration-700 delay-500">
             <Eye className="w-10 h-10 text-slate-800" />
          </div>

          {/* Bottom Right - User photo */}
          <div className="absolute bottom-[10%] right-[25%] z-10 w-16 h-16 bg-slate-200 rounded-2xl shadow-lg border-2 border-white flex items-center justify-center overflow-hidden animate-in slide-in-from-top-8 duration-700 delay-600">
             <Users className="w-8 h-8 text-slate-500" />
          </div>

        </div>

        {/* Text Content */}
        <h1 className="text-5xl md:text-[4.5rem] font-bold tracking-tight text-slate-900 leading-[1.1] mb-6 max-w-4xl">
          All-in-one HR <br /> platform
        </h1>

        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl font-medium">
          Smart HR is a modern, all-in-one HR platform designed to perfectly fit your business needs.
        </p>

        <Link href="/signup">
          <Button className="bg-[#FF6B4A] hover:bg-[#E55A3B] text-white text-lg font-medium px-10 py-7 rounded-2xl shadow-lg transition-transform hover:-translate-y-1">
            Request a Demo
          </Button>
        </Link>
      </main>
    </div>
  );
}
