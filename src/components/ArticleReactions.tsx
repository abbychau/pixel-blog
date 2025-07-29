'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import EmojiPicker from './EmojiPicker';
import Avatar from './Avatar';
import { ReactionCount, Reaction } from '@/lib/database';

interface ArticleReactionsProps {
  articleId: number;
  className?: string;
}

export default function ArticleReactions({ articleId, className = '' }: ArticleReactionsProps) {
  const [reactionCounts, setReactionCounts] = useState<ReactionCount[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { authenticatedFetch, user } = useAuthenticatedFetch();

  useEffect(() => {
    fetchReactions();
  }, [articleId]);

  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/reactions?articleId=${articleId}`);
      if (response.ok) {
        const data = await response.json();
        setReactionCounts(data.reactionCounts || []);
        setReactions(data.reactions || []);
        
        // Find user's current reaction  
        if (user) {
          const userReactionData = data.reactions?.find((r: any) => r.firebase_uid === user.uid);
          setUserReaction(userReactionData?.emoji || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (!user || loading) return;
    
    setLoading(true);
    try {
      // If user already reacted with this emoji, remove it
      if (userReaction === emoji) {
        const response = await authenticatedFetch(`/api/reactions?articleId=${articleId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const data = await response.json();
          setReactionCounts(data.reactionCounts || []);
          setUserReaction(null);
        }
      } else {
        // Add or change reaction
        const response = await authenticatedFetch(`/api/reactions?articleId=${articleId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ emoji })
        });
        
        if (response.ok) {
          const data = await response.json();
          setReactionCounts(data.reactionCounts || []);
          setUserReaction(emoji);
        }
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactionClick = async (emoji: string) => {
    if (!user || loading) return;
    
    // If user clicked their current reaction, remove it
    if (userReaction === emoji) {
      await handleEmojiSelect(emoji);
    } else {
      // Otherwise, add this reaction
      await handleEmojiSelect(emoji);
    }
  };

  const totalReactions = reactionCounts.reduce((sum, r) => sum + r.count, 0);

  // Get users who reacted with a specific emoji
  const getUsersForEmoji = (emoji: string) => {
    return reactions.filter(r => r.emoji === emoji);
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="terminal-orange font-bold text-lg font-mono">REACTIONS</h3>
        <span className="terminal-gray text-sm font-mono">
          {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
        </span>
      </div>

      {/* Reaction Display */}
      {reactionCounts.length > 0 && (
        <div className="space-y-4 mb-6">
          {reactionCounts.map((reaction) => {
            const usersForEmoji = getUsersForEmoji(reaction.emoji);
            return (
              <div key={reaction.emoji} className="border border-bloomberg-gray rounded-lg p-4 bg-bloomberg-darkgray/10">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => handleReactionClick(reaction.emoji)}
                    disabled={!user || loading}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all font-mono text-sm ${
                      userReaction === reaction.emoji
                        ? 'border-bloomberg-orange bg-bloomberg-orange/20 text-bloomberg-orange'
                        : 'border-bloomberg-gray bg-bloomberg-darkgray/20 hover:border-bloomberg-orange text-terminal-gray hover:text-terminal-white'
                    } ${!user ? 'cursor-default' : 'cursor-pointer'}`}
                    title={user ? (userReaction === reaction.emoji ? 'Remove your reaction' : 'React with this emoji') : 'Login to react'}
                  >
                    <span className="text-lg">{reaction.emoji}</span>
                    <span className="text-xs font-bold">{reaction.count}</span>
                  </button>
                  <div className="terminal-gray text-sm font-mono">
                    {usersForEmoji.map((userReaction, index) => (
                      <span key={userReaction.user_id}>
                        <Link
                          href={`/user/${userReaction.username}`}
                          className="terminal-yellow hover:terminal-orange transition-colors underline"
                        >
                          {userReaction.display_name || userReaction.username}
                        </Link>
                        {index < usersForEmoji.length - 1 && (
                          <span className="terminal-gray">
                            {index === usersForEmoji.length - 2 ? ' and ' : ', '}
                          </span>
                        )}
                      </span>
                    ))}
                    <span className="terminal-gray"> reacted</span>
                  </div>
                </div>
                
                {/* User List */}
                <div className="flex flex-wrap gap-2">
                  {usersForEmoji.map((userReaction) => (
                    <Link
                      key={userReaction.user_id}
                      href={`/user/${userReaction.username}`}
                      className="flex items-center gap-2 px-3 py-2 bg-bloomberg-darkgray/30 border border-bloomberg-gray rounded text-xs font-mono hover:border-bloomberg-orange hover:bg-bloomberg-orange/10 transition-colors"
                    >
                      <Avatar
                        src={userReaction.avatar}
                        alt={userReaction.display_name || userReaction.username}
                        size="xs"
                        fallbackColor={userReaction.display_color || 'var(--bloomberg-fallback-user-color)'}
                      />
                      <span className="terminal-yellow hover:terminal-orange transition-colors">
                        {userReaction.display_name || userReaction.username}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Emoji Picker */}
      {user ? (
        <EmojiPicker 
          onEmojiSelect={handleEmojiSelect}
          disabled={loading}
          className="mb-4"
        />
      ) : (
        <div className="mb-4 p-4 bg-bloomberg-darkgray/20 border border-bloomberg-gray rounded">
          <p className="terminal-gray text-sm font-mono text-center">
            <span className="terminal-blue">LOGIN REQUIRED:</span> Sign in to react to this article
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-2">
          <span className="terminal-orange font-mono text-sm">Updating reaction...</span>
        </div>
      )}

      {/* No Reactions State */}
      {reactionCounts.length === 0 && (
        <div className="text-center py-6 border border-bloomberg-gray rounded bg-bloomberg-darkgray/10">
          <p className="terminal-gray font-mono text-sm mb-2">No reactions yet</p>
          <p className="terminal-blue font-mono text-xs">Be the first to react!</p>
        </div>
      )}
    </div>
  );
}