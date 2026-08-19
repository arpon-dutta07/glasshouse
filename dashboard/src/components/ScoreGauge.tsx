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
  strokeWidth = 6,
  showLabel = true,
}) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 90) return { stroke: "#34d399", text: "text-emerald-400", label: "Excellent" };
    if (s >= 75) return { stroke: "#22d3ee", text: "text-cyan-400", label: "Good" };
    if (s >= 60) return { stroke: "#fbbf24", text: "text-amber-400", label: "Fair" };
    if (s >= 40) return { stroke: "#fb923c", text: "text-orange-400", label: "Concerning" };
    return { stroke: "#f87171", text: "text-red-400", label: "Critical" };
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
          stroke="rgba(255, 255, 255, 0.04)"
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
          className="gauge-glow"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      {/* Centered Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold tracking-tight ${theme.text}`}>
          {safeScore}
        </span>
      </div>
      {showLabel && (
        <span className={`mt-1.5 text-[10px] font-medium ${theme.text} opacity-70`}>
          {theme.label}
        </span>
      )}
    </div>
  );
};
