'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72,
  '2xl': 125,
};

export default function Logo({ size = '2xl', className = '' }: LogoProps) {
  const pixelSize = sizes[size];
  
  return (
    <Image
      src="/images/Logo.png"
      alt="LOCKN Logo"
      width={pixelSize}
      height={pixelSize}
      className={`object-contain ${className}`}
      priority
    />
  );
}
