import React from "react";

interface ClubLogoProps {
  size?: number;
  className?: string;
  variant?: "dark" | "light" | "badge";
  showText?: boolean;
}

export default function ClubLogo({
  size = 40,
  className = "",
  variant = "dark",
  showText = false,
}: ClubLogoProps) {
  const isLight = variant === "light";
  const bgFill = isLight ? "#163021" : "#0f2115";
  const primaryStroke = "#dfff45";
  const innerOpacity = isLight ? 0.5 : 0.45;
  const laurelOpacity = isLight ? 0.85 : 0.75;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="The Champions Club Crest"
      >
        <defs>
          <filter id="cc-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Outer Medallion Base */}
        <circle cx="26" cy="26" r="24" fill={bgFill} stroke={primaryStroke} strokeWidth={isLight ? "2" : "1.6"} />

        {/* Inner Milled Precision Ring */}
        <circle
          cx="26"
          cy="26"
          r="21"
          stroke={primaryStroke}
          strokeWidth="0.75"
          strokeDasharray="1.5 2"
          opacity={innerOpacity}
        />

        {/* Symmetrical Victory Laurels */}
        <g stroke={primaryStroke} strokeWidth="1" strokeLinecap="round" opacity={laurelOpacity}>
          {/* Left Laurel Branch */}
          <path d="M 14 36 C 10.5 30 10.5 22 14 16" />
          <path d="M 12.8 33 C 11.2 32 9.5 30 10.2 28.5" />
          <path d="M 11.5 27 C 9.8 26 8.5 24 9.2 22.5" />
          <path d="M 11.5 21 C 10 19.8 9.5 18 10.5 16.5" />
          <path d="M 13.2 15.5 C 12 14 12 12.5 13.5 11.5" />

          {/* Right Laurel Branch */}
          <path d="M 38 36 C 41.5 30 41.5 22 38 16" />
          <path d="M 39.2 33 C 40.8 32 42.5 30 41.8 28.5" />
          <path d="M 40.5 27 C 42.2 26 43.5 24 42.8 22.5" />
          <path d="M 40.5 21 C 42 19.8 42.5 18 41.5 16.5" />
          <path d="M 38.8 15.5 C 40 14 40 12.5 38.5 11.5" />
        </g>

        {/* Coronet Apex Crown */}
        <path d="M 22 12.5 L 23.5 10.5 L 26 11.8 L 28.5 10.5 L 30 12.5 H 22 Z" fill={primaryStroke} />
        <circle cx="23.5" cy="9.8" r="0.8" fill={primaryStroke} />
        <circle cx="26" cy="9.2" r="1.1" fill={primaryStroke} />
        <circle cx="28.5" cy="9.8" r="0.8" fill={primaryStroke} />

        {/* Handcrafted Interlocking CC Monogram */}
        <g filter="url(#cc-shadow)">
          {/* Left C (Center at 21, span 13..29) */}
          <path
            d="M 28 18.5 A 8.5 9 0 1 0 28 33.5"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Right C Cutout Mask for optical depth */}
          <path
            d="M 39 18.5 A 8.5 9 0 1 0 39 33.5"
            fill="none"
            stroke={bgFill}
            strokeWidth="5.8"
            strokeLinecap="round"
          />
          {/* Right C (Center at 31, span 23..39) */}
          <path
            d="M 39 18.5 A 8.5 9 0 1 0 39 33.5"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Left C Overpass Bridge (Interlocks the top of Left C over Right C) */}
          <path
            d="M 28 18.5 A 8.5 9 0 0 0 22 23.5"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </g>

        {/* Cardinal Diamond Anchor Stud */}
        <circle cx="26" cy="45" r="1" fill={primaryStroke} />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none text-left">
          <span className="font-display font-bold uppercase tracking-wider text-white text-[19px]">
            Champions
          </span>
          <span className="text-[8.5px] font-semibold tracking-[0.34em] uppercase text-white/55 mt-1">
            The Club
          </span>
        </div>
      )}
    </div>
  );
}
