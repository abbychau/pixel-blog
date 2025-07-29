'use client';

import { User } from 'lucide-react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackColor?: string;
}

export default function Avatar({ 
  src, 
  alt = 'Avatar', 
  size = 'md', 
  className = '',
  fallbackColor = '#ff8c00'
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8', 
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full border border-bloomberg-gray bg-bloomberg-darkgray flex items-center justify-center overflow-hidden ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={256}
          height={256}
          className="w-full h-full object-cover"
        />
      ) : (
        <User 
          size={iconSizes[size]} 
          className="terminal-gray" 
          style={{ color: fallbackColor }} 
        />
      )}
    </div>
  );
}