'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';

type Props = {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: 'md' | 'lg' | 'xl';
};

const SIZE_MAP = {
  xs: { box: 'w-8 h-8', icon: 'w-4 h-4', px: 32 },
  sm: { box: 'w-10 h-10', icon: 'w-5 h-5', px: 40 },
  md: { box: 'w-14 h-14', icon: 'w-6 h-6', px: 56 },
  lg: { box: 'w-24 h-24', icon: 'w-10 h-10', px: 96 },
  xl: { box: 'w-full aspect-square', icon: 'w-12 h-12', px: 200 },
};

export function ProductImage({ src, alt, size = 'md', className = '', rounded = 'lg' }: Props) {
  const s = SIZE_MAP[size];
  const round = rounded === 'xl' ? 'rounded-xl' : rounded === 'md' ? 'rounded-md' : 'rounded-lg';

  if (!src) {
    return (
      <div
        className={`${s.box} ${round} bg-indigo-50 flex items-center justify-center flex-shrink-0 ${className}`}
      >
        <Package className={`${s.icon} text-indigo-400`} />
      </div>
    );
  }

  return (
    <div
      className={`${s.box} ${round} relative overflow-hidden bg-gray-100 flex-shrink-0 ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${s.px}px`}
        className="object-cover"
        unoptimized={src.startsWith('http') && !src.includes('unsplash')}
      />
    </div>
  );
}
