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
  const [animatedScore, setAnimatedScore] = useState(score);

  useEffect(() => {
    // Smooth transition
    const timer = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timer);
  }, [score]);

  const safeScore = Math.max(0, Math.min(100, Math.round(animatedScore)));

  // Semicircle geometry (180 degree arc: from -180deg to 0deg)
  const strokeWidth = Math.max(6, Math.round(size * 0.08));
  const radius = (size - strokeWidth * 2) / 2;
  const arcLength = Math.PI * radius;
  const progressOffset = arcLength * (1 - safeScore / 100);

  // Needle angle: 0 score = -180 deg, 100 score = 0 deg
  const needleAngle = -180 + (safeScore / 100) * 180;

  // Determine active zone color
  const getTheme = (s: number) => {
    if (s >= 80) {
      return {
        color: "#4ade80",
        glow: "rgba(74, 222, 128, 0.4)",
        text: "text-emerald-400",
        bgBadge: "bg-emerald-500/10 border-emerald-500/20",
        label: "STRONG PRIVACY",
      };
    }
    if (s >= 50) {
      return {
        color: "#fbbf24",
        glow: "rgba(251, 191, 36, 0.4)",
        text: "text-amber-400",
        bgBadge: "bg-amber-500/10 border-amber-500/20",
        label: "MODERATE RISK",
      };
    }
    return {
      color: "#f87171",
      glow: "rgba(248, 113, 113, 0.4)",
      text: "text-red-400",
      bgBadge: "bg-red-500/10 border-red-500/20",
      label: "HIGH EXPOSURE",
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
            {/* Gradient along the radar arc */}
            <linearGradient id={`gauge-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            <filter id={`gauge-glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Color Zone Segment Indicators (Tick marks) */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angleRad = Math.PI + (tick / 100) * Math.PI;
            const x1 = centerX + (radius - strokeWidth / 2 - 2) * Math.cos(angleRad);
            const y1 = centerY + (radius - strokeWidth / 2 - 2) * Math.sin(angleRad);
            const x2 = centerX + (radius + strokeWidth / 2 + 2) * Math.cos(angleRad);
            const y2 = centerY + (radius + strokeWidth / 2 + 2) * Math.sin(angleRad);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="1.5"
              />
            );
          })}

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
              transition: "stroke-dashoffset 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: `drop-shadow(0 0 4px ${theme.glow})`,
            }}
          />

          {/* Needle Indicator */}
          {showNeedle && (
            <g
              transform={`translate(${centerX}, ${centerY}) rotate(${needleAngle})`}
              style={{ transition: "transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <line
                x1="0"
                y1="0"
                x2={radius - 4}
                y2="0"
                stroke={theme.color}
                strokeWidth={Math.max(2, Math.round(size * 0.025))}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${theme.color})` }}
              />
              <circle cx="0" cy="0" r={Math.max(3.5, strokeWidth * 0.45)} fill="#090c12" stroke={theme.color} strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Numeric Score Center Overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none pb-0"
          style={{ bottom: "0px" }}
        >
          <span
            className={`font-black font-hud tracking-tight leading-none ${theme.text}`}
            style={{ fontSize: `${Math.max(16, Math.round(size * 0.24))}px` }}
          >
            {safeScore}
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
            /100
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border ${theme.bgBadge} ${theme.text} uppercase tracking-wider`}
        >
          {theme.label}
        </span>
      )}
    </div>
  );
};
