'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ 
  className = '', 
  showLabel = false,
  size = 'md' 
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 terminal-blue hover:terminal-orange transition-colors p-1
        ${className}
      `}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={iconSizes[size]} />
      ) : (
        <Moon size={iconSizes[size]} />
      )}
      {showLabel && (
        <span className="font-bold uppercase tracking-wider text-sm">
          {theme === 'dark' ? 'LIGHT' : 'DARK'}
        </span>
      )}
    </button>
  );
}