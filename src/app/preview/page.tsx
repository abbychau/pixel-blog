'use client';

import { useEffect, useState } from 'react';
import MarkdownContent from '@/components/markdown-content';
import { formatDate } from '@/lib/utils';

interface PreviewData {
  title: string;
  content: string;
  excerpt?: string;
  category_name?: string;
  category_color?: string;
  author_name?: string;
  author_color?: string;
  created_at: string;
}

export default function PreviewPage() {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => {
    // Get preview data from sessionStorage
    const data = sessionStorage.getItem('previewData');
    if (data) {
      try {
        setPreviewData(JSON.parse(data));
      } catch (error) {
        console.error('Error parsing preview data:', error);
      }
    }
  }, []);

  if (!previewData) {
    return (
      <div className="min-h-screen bg-black text-bloomberg-yellow flex items-center justify-center">
        <div className="terminal-orange">LOADING PREVIEW...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-bloomberg-yellow">
      {/* Simple header */}
      <div className="border-b border-bloomberg-gray p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold terminal-orange">ARTICLE PREVIEW</h1>
          <button 
            onClick={() => window.close()}
            className="text-xs terminal-gray hover:terminal-orange transition-colors"
          >
            CLOSE PREVIEW
          </button>
        </div>
      </div>

      {/* Article content */}
      <div className="p-8">
        {/* Article Header */}
        <div className="border-b border-bloomberg-gray p-8 mb-8">
          <h1 className="text-4xl font-bold terminal-orange mb-4 tracking-wide">
            {previewData.title}
          </h1>
          
          <div className="flex gap-6 text-sm">
            <div>
              AUTHOR: <span 
                className="font-mono font-bold"
                style={{ color: previewData.author_color || '#0080ff' }}
              >
                {previewData.author_name?.toUpperCase() || 'PREVIEW USER'}
              </span>
            </div>
            {previewData.category_name && (
              <div>
                CATEGORY: <span 
                  style={{ color: previewData.category_color || '#ff8c00' }} 
                  className="font-bold"
                >
                  {previewData.category_name.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              PUBLISHED: <span className="terminal-green">
                {formatDate(previewData.created_at)}
              </span>
            </div>
            <div>
              STATUS: <span className="terminal-blue">
                PREVIEW
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-4xl mx-auto">
          <div className="bloomberg-panel">
            <MarkdownContent 
              content={previewData.content}
              className="markdown-content"
            />
          </div>
        </main>
      </div>
    </div>
  );
}