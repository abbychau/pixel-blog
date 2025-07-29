'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ReactMarkdown, remarkGfm, remarkBreaks } from '@/lib/markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import ImageModal from './ImageModal';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent = React.memo(({ content, className = '' }: MarkdownContentProps) => {
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);

  // Function to process text and render mentions and hashtags
  const processTextWithMentionsAndTags = (text: string) => {
    if (!text) return text;
    
    // Process text to find mentions (@username) and hashtags (#tag)
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Combined regex for both mentions and hashtags
    const combinedRegex = /(@[a-z0-9_]{3,20}|#[\w\u0080-\uFFFF]+)/gi;
    let match;
    
    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      const matchedText = match[0];
      
      if (matchedText.startsWith('@')) {
        // It's a mention
        const username = matchedText.substring(1);
        parts.push(
          <Link
            key={`mention-${match.index}`}
            href={`/user/${username}`}
            className="terminal-blue hover:terminal-orange transition-colors font-bold"
            style={{ textDecoration: 'none' }}
          >
            {matchedText}
          </Link>
        );
      } else if (matchedText.startsWith('#')) {
        // It's a hashtag
        const tagName = matchedText.substring(1).toLowerCase();
        parts.push(
          <Link
            key={`tag-${match.index}`}
            href={`/tag/${tagName}`}
            className="terminal-green hover:terminal-orange transition-colors font-bold"
            style={{ textDecoration: 'none' }}
          >
            {matchedText}
          </Link>
        );
      }
      
      lastIndex = match.index + matchedText.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 1 ? <>{parts}</> : text;
  };

  // Memoize the components configuration to prevent re-creation on every render
  const components = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }: any) => {
      // Remove node from props before passing to avoid [object Object] issue
      const { node: _, ...cleanProps } = props;
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline && language ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          {...cleanProps}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code 
          className={className}
          {...cleanProps}
        >
          {children}
        </code>
      );
    },
    pre: ({ node, children, ...props }: any) => {
      // Remove node from props to avoid [object Object] issue
      const { node: _, ...cleanProps } = props;
      return (
        <pre {...cleanProps}>
          {children}
        </pre>
      );
    },
    // Custom text renderer to process mentions and hashtags
    p: ({ node, children, ...props }: any) => {
      // Remove node from props to avoid [object Object] issue
      const { node: _, ...cleanProps } = props;
      return (
        <p {...cleanProps}>
          {React.Children.map(children, (child) => {
            if (typeof child === 'string') {
              return processTextWithMentionsAndTags(child);
            }
            return child;
          })}
        </p>
      );
    },
    // Process text in other elements too
    text: ({ value }: any) => {
      return processTextWithMentionsAndTags(value);
    },
    // Custom link renderer to open in new tabs
    a: ({ node, href, children, ...props }: any) => {
      const { node: _, ...cleanProps } = props;
      
      // If the link already has target="_blank", preserve it
      // Otherwise, add target="_blank" for external links
      const targetBlank = cleanProps.target === '_blank' || !cleanProps.target;
      
      return (
        <a 
          href={href}
          target={targetBlank ? "_blank" : cleanProps.target}
          rel={targetBlank ? "noopener noreferrer" : cleanProps.rel}
          {...cleanProps}
        >
          {children}
        </a>
      );
    },
    // Custom image renderer to handle modal on click if not wrapped in anchor
    img: ({ node, src, alt, ...props }: any) => {
      const { node: _, ...cleanProps } = props;
      
      const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        // Check if the image is wrapped in an anchor tag
        const target = e.target as HTMLImageElement;
        const parentAnchor = target.closest('a');
        
        if (!parentAnchor) {
          // Image is not wrapped in an anchor tag
          // Check if the image is larger than its displayed size
          const naturalWidth = target.naturalWidth;
          const naturalHeight = target.naturalHeight;
          const displayedWidth = target.offsetWidth;
          const displayedHeight = target.offsetHeight;
          
          // Only show modal if the image is scaled down significantly
          if (naturalWidth > displayedWidth * 1.2 || naturalHeight > displayedHeight * 1.2) {
            e.preventDefault();
            setModalImage({ src: src || '', alt: alt || '' });
          }
        }
      };
      
      return (
        <img
          src={src}
          alt={alt}
          onClick={handleImageClick}
          style={{ cursor: 'pointer' }}
          {...cleanProps}
        />
      );
    },
  }), [setModalImage]); // Include setModalImage in dependencies

  return (
    <>
      <div className={`prose dark:prose-invert overflow-x-hidden ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
      <ImageModal
        src={modalImage?.src || ''}
        alt={modalImage?.alt || ''}
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
      />
    </>
  );
});

MarkdownContent.displayName = 'MarkdownContent';

export default MarkdownContent;