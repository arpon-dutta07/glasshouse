"use client";

import React, { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score?: number;
  size?: number; // width in px
  showLabel?: boolean;
  showNeedle?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score = 100,
  size = 140,
  showLabel = true,
  showNeedle = true,
}) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const [currentScore, setCurrentScore] = useState<number>(safeScore);

  useEffect(() => {
    setCurrentScore(95);
    const settleTimer = setTimeout(() => {
      setCurrentScore(safeScore);
    }, 180);

    return () => clearTimeout(settleTimer);
  }, [safeScore]);

  // Semicircle geometry
  const strokeWidth = Math.max(7, Math.round(size * 0.08));
  const radius = (size - strokeWidth * 2) / 2;
  const arcLength = Math.PI * radius;
  const progressOffset = arcLength * (1 - currentScore / 100);

  // Needle angle: 0 score = -180 deg, 100 score = 0 deg
  const needleAngle = -180 + (currentScore / 100) * 180;

  const getTheme = (s: number) => {
    if (s >= 80) {
      return {
        color: "#22c55e",
        text: "text-emerald-600 dark:text-emerald-400",
        bgBadge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
        label: "Optimal Privacy",
      };
    }
    if (s >= 50) {
      return {
        color: "#f59e0b",
        text: "text-amber-600 dark:text-amber-400",
        bgBadge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
        label: "Moderate Exposure",
      };
    }
    return {
      color: "#ef4444",
      text: "text-rose-600 dark:text-rose-400",
      bgBadge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20",
      label: "High Risk",
    };
  };

  const theme = getTheme(safeScore);
  const height = size * 0.65;
  const centerX = size / 2;
  const centerY = size / 2 + strokeWidth;

  return (
    <div className="inline-flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center" style={{ width: `${size}px`, height: `${height}px` }}>
        <svg
          width={size}
          height={height}
          viewBox={`0 0 ${size} ${height}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`gauge-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="45%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-white/[0.08]"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Gradient Filled Progress Arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke={`url(#gauge-grad-${size})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={progressOffset}
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {/* Needle Indicator */}
          {showNeedle && (
            <g
              transform={`translate(${centerX}, ${centerY}) rotate(${needleAngle})`}
              style={{ transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <line
                x1="0"
                y1="0"
                x2={radius - 4}
                y2="0"
                stroke={theme.color}
                strokeWidth={Math.max(2.5, Math.round(size * 0.025))}
                strokeLinecap="round"
              />
              <circle
                cx="0"
                cy="0"
                r={Math.max(4, strokeWidth * 0.45)}
                fill="currentColor"
                className="text-white dark:text-[#10131e]"
                stroke={theme.color}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Numeric Score Center Readout */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none"
          style={{ bottom: "2px" }}
        >
          <span
            className={`font-extrabold font-heading tracking-tight leading-none ${theme.text}`}
            style={{ fontSize: `${Math.max(20, Math.round(size * 0.26))}px` }}
          >
            {safeScore}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold border ${theme.bgBadge} transition-all`}
        >
          {theme.label}
        </span>
      )}
    </div>
  );
};
