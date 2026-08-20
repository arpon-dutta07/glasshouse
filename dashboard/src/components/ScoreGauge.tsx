"use client";

import React, { useEffect, useState, useId } from "react";

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
  const [currentScore, setCurrentScore] = useState<number>(0);
  const uniqueId = useId().replace(/:/g, "_");

  useEffect(() => {
    // Animate from 0 → overshoot → settle
    const overshootTimer = setTimeout(() => {
      setCurrentScore(Math.min(100, safeScore + 3));
    }, 50);
    const settleTimer = setTimeout(() => {
      setCurrentScore(safeScore);
    }, 350);

    return () => {
      clearTimeout(overshootTimer);
      clearTimeout(settleTimer);
    };
  }, [safeScore]);

  // Semicircle geometry — arc sweeps from left (score=0) to right (score=100)
  const strokeWidth = Math.max(7, Math.round(size * 0.08));
  const radius = (size - strokeWidth * 2) / 2;
  const arcLength = Math.PI * radius;
  // progressOffset: full arc hidden when score=0, fully visible when score=100
  const progressOffset = arcLength * (1 - currentScore / 100);

  // Needle tip position: angle goes from PI (left, score=0) to 0 (right, score=100)
  const tipAngleRad = Math.PI * (1 - currentScore / 100);
  const centerX = size / 2;
  const centerY = size / 2 + strokeWidth;
  const tipX = centerX + radius * Math.cos(tipAngleRad);
  const tipY = centerY - radius * Math.sin(tipAngleRad);

  const getTheme = (s: number) => {
    if (s >= 80) {
      return {
        color: "#22c55e",
        glowColor: "rgba(34, 197, 94, 0.4)",
        text: "text-emerald-600 dark:text-emerald-400",
        bgBadge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
        label: "Optimal Privacy",
      };
    }
    if (s >= 50) {
      return {
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.4)",
        text: "text-amber-600 dark:text-amber-400",
        bgBadge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
        label: "Moderate Exposure",
      };
    }
    return {
      color: "#ef4444",
      glowColor: "rgba(239, 68, 68, 0.4)",
      text: "text-rose-600 dark:text-rose-400",
      bgBadge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20",
      label: "High Risk",
    };
  };

  const theme = getTheme(safeScore);
  const svgHeight = size * 0.58 + strokeWidth;

  return (
    <div className="inline-flex flex-col items-center justify-center select-none">
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size * 0.58}px` }}
      >
        <svg
          width={size}
          height={svgHeight}
          viewBox={`0 0 ${size} ${svgHeight}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`gauge-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="45%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={theme.color} floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Background Track Arc (left to right semicircle) */}
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
            stroke={`url(#gauge-grad-${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={progressOffset}
            style={{
              transition: "stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {/* Speedometer Glowing Node Pointer */}
          {showNeedle && (
            <g style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              {/* Outer Pulse Glow */}
              <circle
                cx={tipX}
                cy={tipY}
                r={strokeWidth * 0.9}
                fill={theme.color}
                opacity={0.35}
              />
              {/* Core Head Indicator */}
              <circle
                cx={tipX}
                cy={tipY}
                r={Math.max(4, strokeWidth * 0.55)}
                fill="#ffffff"
                stroke={theme.color}
                strokeWidth="2.5"
                filter={`url(#glow-${uniqueId})`}
              />
            </g>
          )}
        </svg>

        {/* Numeric Score Center Readout */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none"
          style={{ paddingBottom: `${size * 0.02}px` }}
        >
          <span
            className={`font-extrabold font-heading tracking-tight leading-none ${theme.text}`}
            style={{ fontSize: `${Math.max(18, Math.round(size * 0.24))}px` }}
          >
            {safeScore}
          </span>
          <span
            className="font-medium text-slate-400 dark:text-slate-400 mt-0.5"
            style={{ fontSize: `${Math.max(9, Math.round(size * 0.085))}px` }}
          >
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

