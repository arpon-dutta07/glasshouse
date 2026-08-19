"use client";

import React from "react";

export const RadarBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-cyan-500/[0.04] dark:bg-cyan-500/[0.07] rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-40 w-[450px] h-[450px] bg-blue-500/[0.03] dark:bg-blue-500/[0.05] rounded-full blur-3xl" />
    </div>
  );
};
