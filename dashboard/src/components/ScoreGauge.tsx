"use client";

import React from "react";

interface ScoreGaugeProps {
  score?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score = 100,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
}) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 90) return { stroke: "#10b981", text: "text-emerald-400", bg: "rgba(16, 185, 129, 0.15)", label: "Excellent" };
    if (s >= 75) return { stroke: "#06b6d4", text: "text-cyan-400", bg: "rgba(6, 182, 212, 0.15)", label: "Good" };
    if (s >= 60) return { stroke: "#f59e0b", text: "text-amber-400", bg: "rgba(245, 158, 11, 0.15)", label: "Fair" };
    if (s >= 40) return { stroke: "#f97316", text: "text-orange-400", bg: "rgba(249, 115, 22, 0.15)", label: "Concerning" };
    return { stroke: "#f43f5e", text: "text-rose-500", bg: "rgba(244, 63, 94, 0.15)", label: "Critical" };
  };

  const theme = getColor(safeScore);

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      {/* Centered Score Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold tracking-tight ${theme.text}`}>
          {safeScore}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
          Score
        </span>
      </div>
      {showLabel && (
        <span className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${theme.text}`} style={{ backgroundColor: theme.bg }}>
          {theme.label}
        </span>
      )}
    </div>
  );
};
