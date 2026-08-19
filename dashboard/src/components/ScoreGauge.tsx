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
  // Proportionally scale font size to circle diameter (e.g. 56px -> 16px, 68px -> 19px, 120px -> 32px)
  const fontSize = Math.max(13, Math.round(size * 0.29));

  return (
    <div className="inline-flex flex-col items-center justify-center select-none">
      {/* Explicitly sized square container so number is always mathematically centered inside circle */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 block"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
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

        {/* Absolute centered score label container with flex centering */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`font-bold font-mono tracking-tight leading-none ${theme.text}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {safeScore}
          </span>
        </div>
      </div>

      {showLabel && (
        <span className={`mt-1.5 text-[10px] font-medium ${theme.text} opacity-80`}>
          {theme.label}
        </span>
      )}
    </div>
  );
};
