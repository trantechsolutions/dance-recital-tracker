import React from 'react';

// Brand mark — the "What Number Are We On?" spotlight question-mark logo.
// Single in-app source of truth for the logo; keep in sync with public/favicon.svg.
// Path-based (no fonts) so it rasterizes identically everywhere. Size via
// className (e.g. "w-20 h-20"); the rounded corners come from the SVG itself.
export default function BrandMark({ className = '', title = 'What Number Are We On?' }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brandMarkBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#brandMarkBg)" />
      {/* Spotlight beam + pool of light */}
      <polygon points="238,22 274,22 422,452 90,452" fill="#ffffff" opacity="0.16" />
      <ellipse cx="256" cy="452" rx="170" ry="36" fill="#ffffff" opacity="0.20" />
      <rect x="236" y="8" width="40" height="26" rx="8" fill="#ffffff" opacity="0.9" />
      {/* Question mark — "what number is up next?" */}
      <path
        d="M200 214 C200 168 312 168 312 214 C312 256 256 262 256 306 L256 320"
        fill="none"
        stroke="#ffffff"
        strokeWidth="48"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="256" cy="388" r="26" fill="#ffffff" />
    </svg>
  );
}
