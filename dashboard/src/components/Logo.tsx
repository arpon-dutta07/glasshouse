"use client";

import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 28, className = "" }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="logo-prism-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="logo-glass-facet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="logo-shield-glow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="logo-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter="url(#logo-drop-shadow)">
          {/* Top Roof Facet */}
          <path d="M16 4 L26 11 L16 18 L6 11 Z" fill="url(#logo-glass-facet)" />

          {/* Left Wall Facet */}
          <path d="M6 11 L16 18 L16 28 L6 21 Z" fill="url(#logo-prism-grad)" />

          {/* Right Wall Facet */}
          <path d="M16 18 L26 11 L26 21 L16 28 Z" fill="url(#logo-shield-glow)" opacity="0.9" />

          {/* Internal Refraction Lattice Lines */}
          <path d="M16 4 L16 28" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <path d="M6 11 L26 11" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <circle cx="16" cy="18" r="2.2" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
