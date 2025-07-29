'use client';

import { useState, useRef } from 'react';
import { Upload, User, Camera, X } from 'lucide-react';
import Image from 'next/image';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onAvatarUpdate?: (avatarUrl: string) => void;
  className?: string;
}

export default function AvatarUpload({ currentAvatar, onAvatarUpdate, className = '' }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { authenticatedFetch } = useAuthenticatedFetch();

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setError('');
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await authenticatedFetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        if (onAvatarUpdate) {
          onAvatarUpdate(data.avatar);
        }
        setPreviewUrl(null); // Clear preview since we now have the real avatar
      } else {
        setError(data.error || 'Failed to upload avatar');
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setError('Network error occurred');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Avatar Display */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-bloomberg-gray bg-bloomberg-darkgray flex items-center justify-center overflow-hidden">
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt="Avatar"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={32} className="terminal-gray" />
            )}
          </div>
          
          {/* Loading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-bloomberg-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-bold terminal-orange mb-1">PROFILE AVATAR</h4>
          <p className="text-xs terminal-gray mb-2">
            Upload a profile picture. Images will be resized to 256x256 pixels.
          </p>
          
          {/* Upload Status */}
          {uploading && (
            <div className="text-xs terminal-blue">Uploading and processing image...</div>
          )}
          
          {error && (
            <div className="text-xs text-red-400 mb-2">{error}</div>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-bloomberg-orange bg-bloomberg-orange/10'
            : 'border-bloomberg-gray hover:border-bloomberg-orange hover:bg-bloomberg-darkgray/20'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="space-y-2">
          <Camera className="mx-auto terminal-orange" size={24} />
          <div className="text-sm font-mono">
            <span className="terminal-orange">Click to upload</span>
            <span className="terminal-gray"> or drag and drop</span>
          </div>
          <div className="text-xs terminal-gray">
            JPEG, PNG, or WebP • Max 5MB
          </div>
        </div>
      </div>

      {/* Preview Controls */}
      {previewUrl && (
        <div className="flex gap-2">
          <button
            onClick={clearPreview}
            disabled={uploading}
            className="flex items-center gap-1 px-3 py-1 text-xs border border-red-500 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            <X size={12} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}