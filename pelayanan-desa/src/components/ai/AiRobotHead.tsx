import React from "react";

interface AiRobotHeadProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export default function AiRobotHead({
  size = 48,
  className = "",
  animated = true,
}: AiRobotHeadProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`ai-robot-head ${animated ? "ai-robot-head--animated" : ""} ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="robotHeadChassis" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E0E7FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>

        <linearGradient id="robotHelmetBorder" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        <linearGradient id="robotVisorBg" x1="16" y1="20" x2="48" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <linearGradient id="robotEarLeft" x1="6" y1="24" x2="12" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        <linearGradient id="robotEarRight" x1="52" y1="24" x2="58" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        <filter id="robotEyeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>

      {/* Neck base */}
      <rect x="25" y="50" width="14" height="5" rx="2.5" fill="#64748B" />
      <rect x="27" y="51" width="10" height="2" rx="1" fill="#94A3B8" />

      {/* Antenna post */}
      <path d="M32 14V7" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Antenna tip glowing bulb */}
      <circle cx="32" cy="6" r="4.5" fill="#38BDF8" className="robot-antenna-bulb" filter="url(#robotEyeGlow)" />
      <circle cx="32" cy="6" r="2" fill="#FFFFFF" />

      {/* Left Ear */}
      <rect x="6" y="24" width="6" height="16" rx="3" fill="url(#robotEarLeft)" />
      <rect x="7" y="28" width="2" height="8" rx="1" fill="#38BDF8" opacity="0.9" />

      {/* Right Ear */}
      <rect x="52" y="24" width="6" height="16" rx="3" fill="url(#robotEarRight)" />
      <rect x="55" y="28" width="2" height="8" rx="1" fill="#38BDF8" opacity="0.9" />

      {/* Head Chassis */}
      <rect
        x="11"
        y="13"
        width="42"
        height="38"
        rx="15"
        fill="url(#robotHeadChassis)"
        stroke="url(#robotHelmetBorder)"
        strokeWidth="2.2"
      />

      {/* Top Head Highlight */}
      <path
        d="M20 16.5C24 15 40 15 44 16.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Visor Screen */}
      <rect
        x="16"
        y="21"
        width="32"
        height="22"
        rx="9"
        fill="url(#robotVisorBg)"
        stroke="#334155"
        strokeWidth="1.2"
      />

      {/* Visor Specular Reflection */}
      <path
        d="M19 24.5C25 24.5 31 27 34 30"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.25"
      />

      {/* Glowing Cyan Eyes */}
      <g className="robot-eyes">
        {/* Left Eye */}
        <ellipse cx="24.5" cy="30.5" rx="3.5" ry="4.5" fill="#38BDF8" filter="url(#robotEyeGlow)" />
        <ellipse cx="24.5" cy="30.5" rx="2.2" ry="3.2" fill="#E0F2FE" />
        <circle cx="25.5" cy="29" r="1.2" fill="#FFFFFF" />

        {/* Right Eye */}
        <ellipse cx="39.5" cy="30.5" rx="3.5" ry="4.5" fill="#38BDF8" filter="url(#robotEyeGlow)" />
        <ellipse cx="39.5" cy="30.5" rx="2.2" ry="3.2" fill="#E0F2FE" />
        <circle cx="40.5" cy="29" r="1.2" fill="#FFFFFF" />
      </g>

      {/* Friendly Smile */}
      <path
        d="M28.5 37.5Q32 40 35.5 37.5"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
        className="robot-mouth"
        filter="url(#robotEyeGlow)"
      />

      {/* Cyber cheek sensors */}
      <circle cx="19.5" cy="36" r="1.3" fill="#38BDF8" opacity="0.6" />
      <circle cx="44.5" cy="36" r="1.3" fill="#38BDF8" opacity="0.6" />
    </svg>
  );
}
