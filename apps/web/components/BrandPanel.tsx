"use client";

import Image from "next/image";
import kptLogo from "../app/assets/images/logos/kpt-logo.png";

export default function BrandPanel() {
  return (
    <div className="relative hidden lg:flex h-full min-h-svh overflow-hidden flex-col items-center justify-center bg-[#1e1e1e]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e1e] via-[#2c2c2c] to-[#1a0e06]" />
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-primary/5 translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/3 right-8 w-2 h-32 bg-primary/40 rounded-full" />
      <div className="absolute top-1/3 right-16 w-2 h-20 bg-primary/20 rounded-full" />
      <div className="relative z-10 flex flex-col items-center text-center px-12 gap-8">
        <div className="flex items-center">
          <Image
            src={kptLogo}
            alt="KPT Industries Ltd"
            width={40}
            height={40}
            priority
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Power Your<br /><span className="text-primary">Distribution Network</span>
          </h2>
          <p className="text-sm text-white/60 max-w-xs leading-relaxed">
            Real-time visibility across your channel partners, dealers, and distributors — from incentive tracking to stock alerts.
          </p>
        </div>
        <div className="grid gap-3 w-full max-w-xs">
          {[
            { label: "Channel Partner Incentives", icon: "🎯" },
            { label: "Live Stock Visibility", icon: "📦" },
            { label: "Sales Performance Analytics", icon: "📊" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
              <span className="text-lg">{f.icon}</span>
              <span className="text-sm text-white/80 font-medium">{f.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30">www.kpt.co.in</p>
      </div>
    </div>
  );
}