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
  size = 130,
  showLabel = true,
  showNeedle = true,
}) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const [currentScore, setCurrentScore] = useState<number>(safeScore);

  useEffect(() => {
    // Smooth ignition sweep-and-settle:
    // Fast peak to 98% then settle to safeScore
    setCurrentScore(98);
    const settleTimer = setTimeout(() => {
      setCurrentScore(safeScore);
    }, 200);

    return () => clearTimeout(settleTimer);
  }, [safeScore]);

  // Semicircle geometry (180 degree arc: from -180deg to 0deg)
  const strokeWidth = Math.max(5, Math.round(size * 0.08));
  const radius = (size - strokeWidth * 2) / 2;
  const arcLength = Math.PI * radius;
  const progressOffset = arcLength * (1 - currentScore / 100);

  // Needle angle: 0 score = -180 deg, 100 score = 0 deg
  const needleAngle = -180 + (currentScore / 100) * 180;

  // Determine active zone color based on true score (high contrast in both modes)
  const getTheme = (s: number) => {
    if (s >= 80) {
      return {
        color: "#16a34a",
        text: "text-emerald-700 dark:text-emerald-400",
        bgBadge: "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30",
        label: "STRONG PRIVACY",
      };
    }
    if (s >= 50) {
      return {
        color: "#d97706",
        text: "text-amber-700 dark:text-amber-400",
        bgBadge: "bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30",
        label: "MODERATE RISK",
      };
    }
    return {
      color: "#dc2626",
      text: "text-red-700 dark:text-red-400",
      bgBadge: "bg-red-100 dark:bg-red-500/10 border-red-300 dark:border-red-500/30",
      label: "HIGH EXPOSURE",
    };
  };

  const theme = getTheme(safeScore);
  const height = size * 0.64;
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
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="currentColor"
            className="text-slate-300 dark:text-white/[0.1]"
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
              transition: "stroke-dashoffset 0.5s ease-out",
            }}
          />

          {/* Needle Indicator */}
          {showNeedle && (
            <g
              transform={`translate(${centerX}, ${centerY}) rotate(${needleAngle})`}
              style={{ transition: "transform 0.5s ease-out" }}
            >
              <line
                x1="0"
                y1="0"
                x2={radius - 3}
                y2="0"
                stroke={theme.color}
                strokeWidth={Math.max(2, Math.round(size * 0.025))}
                strokeLinecap="round"
              />
              <circle
                cx="0"
                cy="0"
                r={Math.max(3.5, strokeWidth * 0.45)}
                fill="currentColor"
                className="text-white dark:text-[#090c12]"
                stroke={theme.color}
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Numeric Score Center Readout */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none"
          style={{ bottom: "0px" }}
        >
          <span
            className={`font-black font-hud tracking-tight leading-none ${theme.text}`}
            style={{ fontSize: `${Math.max(16, Math.round(size * 0.24))}px` }}
          >
            {safeScore}
          </span>
          <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            /100
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${theme.bgBadge} ${theme.text} uppercase tracking-wider`}
        >
          {theme.label}
        </span>
      )}
    </div>
  );
};
