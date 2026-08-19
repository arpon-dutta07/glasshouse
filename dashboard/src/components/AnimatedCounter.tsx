"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number | string;
  decimals?: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals,
  duration = 800,
  prefix = "",
  suffix = "",
  className = "",
}) => {
  const numericTarget = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  const isDecimal = decimals !== undefined ? decimals > 0 : String(value).includes(".");
  const decimalPlaces = decimals !== undefined ? decimals : isDecimal ? 1 : 0;

  const [displayValue, setDisplayValue] = useState<number>(() =>
    isNaN(numericTarget) ? 0 : numericTarget
  );
  const prevTargetRef = useRef<number>(numericTarget);

  useEffect(() => {
    if (isNaN(numericTarget)) return;

    const startValue = displayValue;
    const targetValue = numericTarget;
    const startTime = performance.now();
    let animationFrameId: number;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic formula: 1 - pow(1 - progress, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetValue - startValue) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(targetValue);
        prevTargetRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [numericTarget, duration]);

  if (isNaN(numericTarget)) {
    return <span className={className}>{value}</span>;
  }

  // Format with commas and exact decimals
  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
