"use client";

import React, { useEffect, useState } from "react";
import { Particles } from "@/components/ui/particles";
import { useTheme } from "@/lib/theme";

export const RadarBackground: React.FC = () => {
  const { theme } = useTheme();
  const [particleColor, setParticleColor] = useState("#818cf8");

  useEffect(() => {
    setParticleColor(theme === "dark" ? "#818cf8" : "#6366f1");
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Soft Ambient Gradient Meshes */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-500/[0.07] via-purple-500/[0.04] to-transparent dark:from-indigo-500/[0.12] dark:via-purple-500/[0.06] rounded-full blur-3xl" />
      <div className="absolute top-[35%] -right-60 w-[550px] h-[550px] bg-blue-500/[0.03] dark:bg-indigo-600/[0.06] rounded-full blur-3xl" />
      <div className="absolute top-[65%] -left-60 w-[550px] h-[550px] bg-purple-500/[0.03] dark:bg-purple-600/[0.05] rounded-full blur-3xl" />

      {/* Interactive Full-Screen Particle Effect */}
      <Particles
        className="absolute inset-0 size-full"
        quantity={65}
        ease={70}
        color={particleColor}
        size={0.6}
        staticity={40}
        refresh
      />

      {/* Modern Grid Line Subtle Pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
};
