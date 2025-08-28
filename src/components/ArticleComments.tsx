'use client';

import { useEffect, useState } from 'react';
import { Send, Edit, Trash2, Reply } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import Avatar from './Avatar';
import MarkdownContent from './markdown-content';

interface Comment {
  id: number;
  article_id: number;
  user_id: number;
  content: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  username?: string;
  display_name?: string;
  avatar?: string;
  display_color?: string;
}

interface ArticleCommentsProps {
  articleId: number;
  articleSlug: string;
  commentsEnabled?: boolean;
}

export default function ArticleComments({ articleId, articleSlug, commentsEnabled = true }: ArticleCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const { user: firebaseUser } = useFirebaseAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();

  useEffect(() => {
    fetchComments();
  }, [articleSlug]);

  useEffect(() => {
    if (firebaseUser?.email && !currentUser) {
      authenticatedFetch('/api/auth/user-info')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(err => {
          console.error('Error fetching user info:', err);
        });
    } else if (!firebaseUser) {
      setCurrentUser(null);
    }
  }, [firebaseUser?.email]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/articles/${articleSlug}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      const response = await authenticatedFetch(`/api/articles/${articleSlug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await authenticatedFetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId ? data.comment : comment
          )
        );
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await authenticatedFetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReplySubmit = async (parentId: number) => {
    if (!replyContent.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      const response = await authenticatedFetch(`/api/articles/${articleSlug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_id: parentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setReplyingTo(null);
        setReplyContent('');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canEditComment = (comment: Comment) => {
    return currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin');
  };

  const getCommentsByParent = () => {
    const parentComments = comments.filter(comment => !comment.parent_id);
    const repliesMap = new Map<number, Comment[]>();
    
    comments.filter(comment => comment.parent_id).forEach(reply => {
      if (!repliesMap.has(reply.parent_id!)) {
        repliesMap.set(reply.parent_id!, []);
      }
      repliesMap.get(reply.parent_id!)!.push(reply);
    });

    return { parentComments, repliesMap };
  };

  const { parentComments, repliesMap } = getCommentsByParent();

  if (!commentsEnabled) {
    return (
      <div className="bloomberg-panel">
        <div className="flex items-center gap-2 mb-4 text-sm font-mono">
          <span className="terminal-green">$</span>
          <span className="terminal-orange">comments</span>
          <span className="terminal-blue">--status</span>
        </div>
        <div className="text-sm terminal-gray pl-4">
          Comments are disabled for this article.
        </div>
      </div>
    );
  }

  return (
    <div className="bloomberg-panel">
      <div className="flex items-center gap-2 mb-6 text-sm font-mono">
        <span className="terminal-green">$</span>
        <span className="terminal-orange">comments</span>
        <span className="terminal-blue">--article={articleId}</span>
        <span className="terminal-yellow ml-auto">
          {loading ? 'LOADING...' : `${comments.length} COMMENT${comments.length !== 1 ? 'S' : ''}`}
        </span>
      </div>

      {/* New Comment Form */}
      {currentUser ? (
        <form onSubmit={handleSubmitComment} className="mb-8 p-4 border border-bloomberg-gray rounded">
          <div className="flex items-start gap-3 mb-3">
            <Avatar
              src={currentUser.avatar}
              alt={currentUser.display_name || 'User'}
              size="sm"
              fallbackColor={currentUser.display_color || '#0080ff'}
            />
            <div className="flex-1">
              <div className="text-xs mb-2">
                <span className="terminal-blue">USER:</span>
                <span 
                  className="ml-2 font-bold"
                  style={{ color: currentUser.display_color || '#0080ff' }}
                >
                  {currentUser.display_name?.toUpperCase()}
                </span>
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full h-20 p-3 bg-bloomberg-darkgray border border-bloomberg-gray rounded text-bloomberg-yellow resize-none focus:outline-none focus:border-terminal-green"
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs terminal-gray">
                  {newComment.length}/1000
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-terminal-green text-black font-bold rounded hover:bg-terminal-yellow disabled:bg-bloomberg-gray disabled:text-terminal-gray transition-colors"
                >
                  <Send size={14} />
                  {submitting ? 'POSTING...' : 'POST COMMENT'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 border border-bloomberg-gray rounded text-center">
          <div className="terminal-gray mb-2">Please log in to post comments.</div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center terminal-gray">Loading comments...</div>
        ) : parentComments.length === 0 ? (
          <div className="text-center terminal-gray">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          parentComments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-bloomberg-gray pl-4">
              {/* Main Comment */}
              <div className="mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar
                    src={comment.avatar}
                    alt={comment.display_name || 'User'}
                    size="sm"
                    fallbackColor={comment.display_color || '#0080ff'}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2 text-xs">
                      <span 
                        className="font-bold"
                        style={{ color: comment.display_color || '#0080ff' }}
                      >
                        {comment.display_name?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <span className="terminal-gray">
                        {formatDate(comment.created_at)}
                        {comment.created_at !== comment.updated_at && ' (edited)'}
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        {canEditComment(comment) && (
                          <>
                            <button
                              onClick={() => {
                                setEditingComment(comment.id);
                                setEditContent(comment.content);
                              }}
                              className="text-terminal-blue hover:text-terminal-yellow transition-colors"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-terminal-red hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {currentUser && (
                          <button
                            onClick={() => {
                              setReplyingTo(comment.id);
                              setReplyContent('');
                            }}
                            className="text-terminal-green hover:text-terminal-yellow transition-colors"
                          >
                            <Reply size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {editingComment === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-20 p-3 bg-bloomberg-darkgray border border-bloomberg-gray rounded text-bloomberg-yellow resize-none focus:outline-none focus:border-terminal-green"
                          maxLength={1000}
                        />
                        <div className="flex justify-between items-center">
                          <div className="text-xs terminal-gray">
                            {editContent.length}/1000
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingComment(null);
                                setEditContent('');
                              }}
                              className="px-3 py-1 text-xs terminal-gray hover:terminal-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditComment(comment.id)}
                              disabled={!editContent.trim() || submitting}
                              className="px-3 py-1 text-xs bg-terminal-blue text-white rounded hover:bg-terminal-green disabled:bg-bloomberg-gray transition-colors"
                            >
                              {submitting ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none">
                        <MarkdownContent content={comment.content} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="ml-12 mt-4 p-3 border border-bloomberg-gray rounded">
                    <div className="text-xs mb-2 terminal-blue">
                      Replying to {comment.display_name?.toUpperCase()}
                    </div>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full h-16 p-2 bg-bloomberg-darkgray border border-bloomberg-gray rounded text-bloomberg-yellow resize-none focus:outline-none focus:border-terminal-green"
                      maxLength={1000}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs terminal-gray">
                        {replyContent.length}/1000
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="px-3 py-1 text-xs terminal-gray hover:terminal-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                          className="px-3 py-1 text-xs bg-terminal-green text-black rounded hover:bg-terminal-yellow disabled:bg-bloomberg-gray transition-colors"
                        >
                          {submitting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Replies */}
              {repliesMap.get(comment.id) && (
                <div className="ml-12 space-y-4 border-l-2 border-bloomberg-gray/50 pl-4">
                  {repliesMap.get(comment.id)!.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-start gap-3 mb-2">
                        <Avatar
                          src={reply.avatar}
                          alt={reply.display_name || 'User'}
                          size="xs"
                          fallbackColor={reply.display_color || '#0080ff'}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2 text-xs">
                            <span 
                              className="font-bold"
                              style={{ color: reply.display_color || '#0080ff' }}
                            >
                              {reply.display_name?.toUpperCase() || 'UNKNOWN'}
                            </span>
                            <span className="terminal-gray">
                              {formatDate(reply.created_at)}
                              {reply.created_at !== reply.updated_at && ' (edited)'}
                            </span>
                            {canEditComment(reply) && (
                              <div className="flex items-center gap-2 ml-auto">
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="text-terminal-red hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="prose prose-invert max-w-none">
                            <MarkdownContent content={reply.content} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}