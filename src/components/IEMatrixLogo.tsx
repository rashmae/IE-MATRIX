import React from 'react';
import { motion } from 'motion/react';

interface IEMatrixLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function IEMatrixLogo({ size = 75, className = '', animate = true }: IEMatrixLogoProps) {
  // We'll use a responsive viewport design inside a clean, high-fidelity SVG path arrangement.
  // This allows the logo to scale perfectly at any resolution with maximum vector sharpness.
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 1.05 }}
      whileHover={{ scale: 1.06, rotateY: 5 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      <svg
        viewBox="0 0 200 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        <defs>
          {/* Core Central Face Gradients */}
          <linearGradient id="coreTopGrad" x1="100" y1="48" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e222b" />
            <stop offset="100%" stopColor="#0a0d14" />
          </linearGradient>
          
          <linearGradient id="coreLeftGrad" x1="55" y1="74" x2="100" y2="152" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="coreRightGrad" x1="100" y1="100" x2="145" y2="152" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Ribbon Gradients for the wrapping 3D illusion */}
          <linearGradient id="ribbonGreenMid" x1="145" y1="74" x2="173.6" y2="142.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="ribbonGreenLeftTop" x1="26.4" y1="57.5" x2="100" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="ribbonDarkTopRight" x1="100" y1="15" x2="173.6" y2="57.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>

          <linearGradient id="ribbonGoldBottom" x1="100" y1="152" x2="173.6" y2="142.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="ribbonGoldLeft" x1="26.4" y1="142.5" x2="100" y2="152" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="ribbonWhiteWedge" x1="100" y1="152" x2="100" y2="185" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ========================================================== */}
        {/* SECTION 1: OUTER TWISTING ISOMETRIC RIBBON (3D EDGE WRAPS)   */}
        {/* ========================================================== */}

        {/* Facet A: Top-Left Mint Green ribbon overlay */}
        <path 
          d="M 26.4,57.5 L 100,15 L 100,48 L 55,74 Z" 
          fill="url(#ribbonGreenLeftTop)"
          stroke="#059669"
          strokeWidth="0.5"
        />

        {/* Facet B: Top-Right dark shadow fold */}
        <path 
          d="M 100,15 L 173.6,57.5 L 145,74 L 100,48 Z" 
          fill="url(#ribbonDarkTopRight)"
          stroke="#022c22"
          strokeWidth="0.5"
        />

        {/* Facet C: Vertical Right-Middle structural support */}
        <path 
          d="M 173.6,57.5 L 173.6,142.5 L 145,126 L 145,74 Z" 
          fill="url(#ribbonGreenMid)"
          stroke="#047857"
          strokeWidth="0.5"
        />

        {/* Facet D: Bottom-Right Warm Gold facet */}
        <path 
          d="M 173.6,142.5 L 100,185 L 100,152 L 145,126 Z" 
          fill="url(#ribbonGoldBottom)"
          stroke="#d97706"
          strokeWidth="0.5"
        />

        {/* Facet E: Bottom-Left Golden Wrap segment */}
        <path 
          d="M 26.4,142.5 L 70,167 L 100,152 L 55,126 Z" 
          fill="url(#ribbonGoldLeft)"
          stroke="#b45309"
          strokeWidth="0.5"
        />

        {/* Facet F: High-Performance White Wedge Ribbon at Bottom-most tip (Ref Highlight!) */}
        <path 
          d="M 100,185 L 70,167 L 100,152 Z" 
          fill="url(#ribbonWhiteWedge)"
          stroke="#cbd5e1"
          strokeWidth="0.5"
        />

        {/* Left Side outer protective light wedge cover */}
        <path 
          d="M 26.4,57.5 L 55,74 L 55,126 L 26.4,142.5 Z" 
          fill="#10b981" 
          opacity="0.2"
        />

        {/* ========================================================== */}
        {/* SECTION 2: THE 3 CENTRAL INNER FACES (THE CORE CUBE)        */}
        {/* ========================================================== */}

        {/* Face 1: CORE TOP (Deep Black/Slate Grid Hub) */}
        <path 
          d="M 100,100 L 145,74 L 100,48 L 55,74 Z" 
          fill="url(#coreTopGrad)" 
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        {/* Face 2: CORE LEFT (Emerald green Systems Face) */}
        <path 
          d="M 100,100 L 55,74 L 55,126 L 100,152 Z" 
          fill="url(#coreLeftGrad)" 
          stroke="#065f46"
          strokeWidth="1.5"
        />

        {/* Face 3: CORE RIGHT (CTU Golden Efficiency Face) */}
        <path 
          d="M 100,100 L 100,152 L 145,126 L 145,74 Z" 
          fill="url(#coreRightGrad)" 
          stroke="#92400e"
          strokeWidth="1.5"
        />

        {/* ========================================================== */}
        {/* SECTION 3: EMBEDDED HIGH-FIDELITY VECTOR GRAPHICS (ICONS)  */}
        {/* ========================================================== */}

        {/* Core Top Face: Industrial engineering gear system with tech nodes */}
        <g transform="translate(100, 74)">
          {/* Node networking link lines inside isometric floor */}
          <line x1="-30" y1="-12" x2="-10" y2="-6" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2 1" />
          <line x1="10" y1="3" x2="32" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <circle cx="-30" cy="-12" r="2.5" fill="#34d399" />
          <circle cx="32" cy="10" r="2" fill="#fbbf24" />

          {/* Rotating Mechanical Gear (Isometric mathematically correct setup) */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0, originY: 0 }}
          >
            {/* The 2D gear representation within the isometric perspective transform wrapper */}
            <g transform="scale(1, 0.577) rotate(45)">
              <circle r="12" fill="none" stroke="#f8fafc" strokeWidth="2.5" />
              {/* Outer Gear teeth */}
              <g stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round">
                <line y1="-14" y2="14" />
                <line x1="-14" x2="14" />
                <line x1="-10" y1="-10" x2="10" y2="10" />
                <line x1="-10" y1="10" x2="10" y2="-10" />
              </g>
              <circle r="7.5" fill="#0f172a" />
              <circle r="3" fill="#34d399" />
            </g>
          </motion.g>
        </g>

        {/* Core Left Face: Optimization & Systems (3D Silver Magnifying Glass) */}
        <g transform="translate(77, 113)">
          {/* Glass body angled correctly on the left wall */}
          {/* Magnifying Glass Outer circle (ellipse isometrically) */}
          <ellipse cx="-2" cy="-5" rx="10" ry="8.5" fill="rgba(255, 255, 255, 0.15)" stroke="#ffffff" strokeWidth="2" />
          {/* Specular glass highlight shining inside lens */}
          <path d="M -7,-7 Q -4,-10 -1,-8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          {/* Sturdy ergonomic handle skewed down and right */}
          <path d="M 4.5,2 L 12.5,13.5" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Small shiny metallic wrap handle tip */}
          <circle cx="12.5" cy="13.5" r="1.5" fill="#fbbf24" />
        </g>

        {/* Core Right Face: Time & Motion efficiency (Premium Hourglass with white streaming sand) */}
        <g transform="translate(123, 113)">
          {/* Top/Bottom heavy timber caps */}
          <line x1="-10" y1="-17" x2="10" y2="-17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="-10" y1="17" x2="10" y2="17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* Curved Glass container frame */}
          <path 
            d="M -7.5,-15 Q -1.5,-1 -7.5,14" 
            stroke="#ffffff" 
            strokeWidth="1.5" 
            fill="none" 
          />
          <path 
            d="M 7.5,-15 Q 1.5,-1 7.5,14" 
            stroke="#ffffff" 
            strokeWidth="1.5" 
            fill="none" 
          />

          {/* Falling sand simulation */}
          {/* Top sand reservoir depletion */}
          <polygon points="-5,-13 5,-13 0,-3" fill="#f8fafc" opacity="0.85" />
          
          {/* Fine continuous sand flow thread */}
          <line x1="0" y1="-2" x2="0" y2="11" stroke="#ffffff" strokeWidth="1" strokeDasharray="1.5 1.5" />

          {/* Bottom sand pile mounting up */}
          <path d="M -6.5,14 Q 0,9 6.5,14 Z" fill="#ffffff" opacity="0.95" />
        </g>

        {/* Sparkle decorative vectors on corners to mimic elite UI */}
        <circle cx="26.4" cy="57.5" r="1.5" fill="#34d399" opacity="0.8" />
        <circle cx="173.6" cy="57.5" r="1.5" fill="#fbb624" opacity="0.8" />
        <circle cx="100" cy="15" r="2" fill="#ffffff" />
      </svg>
    </motion.div>
  );
}
