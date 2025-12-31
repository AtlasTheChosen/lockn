'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const pixelSize = sizes[size];
  
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="50" cy="50" r="45" fill="#93C5FD" />
      
      {/* Flashcards behind lock */}
      <g transform="translate(45, 25)">
        {/* Back card */}
        <rect
          x="8"
          y="8"
          width="40"
          height="50"
          rx="4"
          fill="#E2E8F0"
          stroke="#1E293B"
          strokeWidth="2.5"
        />
        {/* Front card */}
        <rect
          x="0"
          y="0"
          width="40"
          height="50"
          rx="4"
          fill="#F8FAFC"
          stroke="#1E293B"
          strokeWidth="2.5"
        />
        {/* Card lines */}
        <rect x="6" y="8" width="20" height="4" rx="1" fill="#CBD5E1" />
        <rect x="6" y="16" width="28" height="2" rx="1" fill="#E2E8F0" />
        <rect x="6" y="22" width="24" height="2" rx="1" fill="#E2E8F0" />
        <rect x="6" y="28" width="26" height="2" rx="1" fill="#E2E8F0" />
      </g>
      
      {/* Lock body */}
      <g transform="translate(8, 20)">
        {/* Lock shackle (top arc) */}
        <path
          d="M20 35 L20 20 C20 8 35 8 35 20 L35 35"
          fill="none"
          stroke="#1E293B"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M22 35 L22 21 C22 12 33 12 33 21 L33 35"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Lock body */}
        <rect
          x="10"
          y="35"
          width="35"
          height="35"
          rx="6"
          fill="#9CA3AF"
          stroke="#1E293B"
          strokeWidth="2.5"
        />
        
        {/* Lock body gradient/shine */}
        <rect
          x="12"
          y="37"
          width="15"
          height="31"
          rx="4"
          fill="#D1D5DB"
          opacity="0.6"
        />
        
        {/* Keyhole */}
        <circle cx="27.5" cy="48" r="5" fill="#1E293B" />
        <rect x="24.5" y="48" width="6" height="12" rx="2" fill="#1E293B" />
        
        {/* Sparkle on lock */}
        <g transform="translate(14, 42)">
          <path
            d="M0 4 L4 4 M2 2 L2 6"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(16, 48)">
          <circle cx="0" cy="0" r="1" fill="white" opacity="0.8" />
        </g>
      </g>
      
      {/* Sparkle decorations */}
      <g transform="translate(82, 18)">
        <path
          d="M0 5 L5 5 M2.5 2.5 L2.5 7.5"
          stroke="#94A3B8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(88, 70)">
        <path
          d="M0 3 L3 3 M1.5 1.5 L1.5 4.5"
          stroke="#94A3B8"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

