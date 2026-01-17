'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizes = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 125,
};

export default function Logo({ size = '2xl', className = '' }: LogoProps) {
  const pixelSize = sizes[size];
  
  return (
    <Image
      src="/images/new bird logo.png"
      alt="FlashDash Bird Logo"
      width={pixelSize}
      height={pixelSize}
      className={`object-contain rounded-lg ${className}`}
      priority
    />
  );
}
