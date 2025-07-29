'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

// Common emojis for reactions
const REACTION_EMOJIS = [
  '👍', '👎', '❤️', '😍', '😂', '😮', '😢', '😡',
  '🎉', '🤔', '👏', '🔥', '💯', '🙌', '😎', '🤯',
  '🥳', '🤩', '😊', '😋', '🤗', '😌', '😴', '🤐',
  '🙃', '😜', '🤪', '😬', '🤨', '🧐', '🤓', '😏'
];

export default function EmojiPicker({ onEmojiSelect, disabled = false, className = '' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-bloomberg-darkgray/30 border border-bloomberg-gray hover:border-bloomberg-orange rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Add reaction"
      >
        <Heart size={16} className="terminal-orange" />
        <span className="terminal-orange text-sm font-mono">REACT</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-black border border-bloomberg-orange rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
          <div className="grid grid-cols-8 gap-2">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-bloomberg-darkgray/50 rounded transition-colors"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-bloomberg-gray">
            <p className="text-xs terminal-gray font-mono text-center">
              Click an emoji to react
            </p>
          </div>
        </div>
      )}
    </div>
  );
}