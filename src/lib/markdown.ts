import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';


import { extractHashtags } from './utils';

// Helper function to extract tags and mentions from content
export function extractTagsAndMentions(content: string) {
  const mentions: string[] = [];
  
  // Extract #tags using the improved algorithm from utils
  const tags = extractHashtags(content);
  
  // Extract @mentions - match @username (only a-z, 0-9, _)
  const mentionMatches = content.match(/(?:^|[^\w.])@([a-z0-9_]{3,20})/g);
  if (mentionMatches) {
    mentionMatches.forEach(match => {
      const mention = match.replace(/^[^@]*@/, '').toLowerCase();
      if (!mentions.includes(mention)) {
        mentions.push(mention);
      }
    });
  }
  
  return { tags, mentions };
}

// Export ReactMarkdown and plugins for use in components
export { ReactMarkdown, remarkGfm, remarkBreaks };