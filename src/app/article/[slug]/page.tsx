'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Plus, Settings } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import MarkdownContent from '@/components/markdown-content';
import ArticleReactions from '@/components/ArticleReactions';
import ArticleComments from '@/components/ArticleComments';
import AuthButtons from '@/components/AuthButtons';
import Avatar from '@/components/Avatar';
import TipButton from '@/components/TipButton';
import TipRecords from '@/components/TipRecords';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import TopBar from '@/components/TopBar';

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  author_id: number;
  author_name?: string;
  author_color?: string;
  author_avatar?: string;
  status: string;
  published_at?: string;
  created_at: string;
  comments_enabled?: boolean;
}

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [authorArticles, setAuthorArticles] = useState<any[]>([]);
  const [tipRefreshTrigger, setTipRefreshTrigger] = useState(0);
  const { isAdmin } = useAdminAuth();
  const { user: firebaseUser } = useFirebaseAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();

  // Dynamic title - will update when article loads
  useDynamicTitle(undefined, { 
    prefix: article?.title || 'Loading Article',
    showUser: isAdmin || !!currentUser, 
    showNotifications: isAdmin || !!currentUser
  });

  useEffect(() => {
    // Set current time on client mount with YYYY/MM/DD HH:MM:SS format
    const formatTime = (date: Date) => {
      return date.getFullYear() + '/' + 
        String(date.getMonth() + 1).padStart(2, '0') + '/' + 
        String(date.getDate()).padStart(2, '0') + ' ' + 
        String(date.getHours()).padStart(2, '0') + ':' + 
        String(date.getMinutes()).padStart(2, '0') + ':' + 
        String(date.getSeconds()).padStart(2, '0');
    };
    
    setCurrentTime(formatTime(new Date()));
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(formatTime(new Date()));
    }, 1000);
    
    if (!params.slug) {
      clearInterval(timeInterval);
      return;
    }

    // Fetch current article and all articles for the marquee
    Promise.all([
      fetch(`/api/articles/${params.slug}`),
      fetch('/api/articles')
    ])
    .then(async ([articleRes, articlesRes]) => {
      if (!articleRes.ok) {
        throw new Error('Article not found');
      }
      const articleData = await articleRes.json();
      const articlesData = articlesRes.ok ? await articlesRes.json() : [];
      
      setArticle(articleData);
      setArticles(articlesData);
      
      // Filter articles by the same author (excluding current article)
      const authorArticlesData = articlesData.filter((art: any) => 
        art.author_id === articleData.author_id && art.id !== articleData.id
      ).slice(0, 5); // Show max 5 articles
      
      setAuthorArticles(authorArticlesData);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });

    return () => clearInterval(timeInterval);
  }, [params.slug]);

  // Fetch current user info for authorship check
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
      // Clear current user if Firebase user is logged out
      setCurrentUser(null);
    }
  }, [firebaseUser?.email]); // Only depend on the email, not the entire function

  // Check if current user can edit this article
  const canEditArticle = () => {
    if (!article) return false;
    // Admin users can edit any article
    if (isAdmin) return true;
    // Firebase users can edit if they are the author
    if (currentUser && currentUser.id === article.author_id) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow p-8">
        <div className="terminal-orange">LOADING ARTICLE DATA...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow p-8">
        <div className="bloomberg-panel">
          <h1 className="text-2xl font-bold terminal-orange mb-4">ERROR 404</h1>
          <p className="terminal-yellow mb-4">ARTICLE NOT FOUND IN DATABASE</p>
          <Link href="/" className="terminal-orange hover:bg-bloomberg-darkgray px-4 py-2 rounded transition-colors">
            ← RETURN TO MAIN TERMINAL
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow">
      <TopBar 
        showNewArticleButton={!!firebaseUser}
        rightContent={
          <div className="flex items-center gap-6 text-xs font-mono hidden md:flex">
            <div className="flex items-center gap-2">
              <span className="terminal-blue">ARTICLES:</span>
              <span className="terminal-yellow">{articles.filter(a => a.status === 'published').length}</span>
            </div>
            <div className="flex items-center gap-2 hidden md:flex">
              <span className="terminal-blue">TIME:</span>
              <span className="terminal-green">{currentTime || '---'}</span>
            </div>
            {canEditArticle() && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/edit/${article.id}`}
                  className="flex items-center gap-1 terminal-green hover:bg-bloomberg-green hover:text-black px-2 py-1 rounded transition-colors font-bold"
                >
                  <Edit size={14} />
                  EDIT
                </Link>
              </div>
            )}
          </div>
        }
      />

      {/* Main Content with top padding for fixed header */}
      <div className="pt-16">
        {/* Article Header */}
        <div className="border-b border-bloomberg-gray p-8">
          <div className="">
            <h1 className="text-4xl font-bold terminal-orange mb-4 tracking-wide">{article.title}</h1>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm">
              {/* First line on mobile: Author and Category */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span>AUTHOR:</span>
                  <Avatar
                    src={article.author_avatar}
                    alt={article.author_name || 'Unknown'}
                    size="xs"
                    fallbackColor={article.author_color || '#0080ff'}
                  />
                  <Link
                    href={`/?author=${article.author_id}`}
                    className="font-mono font-bold hover:underline transition-colors"
                    style={{ color: article.author_color || '#0080ff' }}
                  >
                    {article.author_name?.toUpperCase() || 'UNKNOWN'}
                  </Link>
                </div>
                {article.category_name && (
                  <div>
                    CATEGORY: <Link
                      href={`/?category=${article.category_id}`}
                      className="font-bold hover:underline transition-colors"
                      style={{ color: article.category_color || '#ff8c00' }}
                    >
                      {article.category_name.toUpperCase()}
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Second line on mobile: Published and Status */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  PUBLISHED: <span className="terminal-green">
                    {article.published_at ? formatDate(article.published_at) : formatDate(article.created_at)}
                  </span>
                </div>
                <div>
                  STATUS: <span className={article.status === 'published' ? 'terminal-green' : 'terminal-blue'}>
                    {article.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="p-2 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bloomberg-panel">
            <MarkdownContent 
              content={article.content}
              className="markdown-content"
            />
          </div>

          {/* Reactions Section */}
          <div className="mt-8">
            <div className="bloomberg-panel">
              <ArticleReactions articleId={article.id} />
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-8">
            <ArticleComments 
              articleId={article.id}
              articleSlug={article.slug}
              commentsEnabled={article.comments_enabled !== false}
            />
          </div>

          {/* Tip Section */}
          <div className="mt-8">
            <TipRecords 
              articleId={article.id} 
              refreshTrigger={tipRefreshTrigger}
              authorId={article.author_id}
              authorName={article.author_name || 'Author'}
              onTipSent={() => setTipRefreshTrigger(prev => prev + 1)}
            />
          </div>

          {/* Author Section */}
          <div className="mt-8 pt-8 border-t border-bloomberg-gray">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Author Details */}
              <div className="bloomberg-panel">
                <div className="flex items-center gap-2 mb-4 text-sm font-mono">
                  <span className="terminal-green">$</span>
                  <span className="terminal-orange">whoami</span>
                  <span className="terminal-blue">--author</span>
                </div>
                <div className="space-y-3 text-sm font-mono pl-4">
                  <div className="flex items-center justify-between">
                    <span>Author:</span>
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={article.author_avatar}
                        alt={article.author_name || 'Unknown'}
                        size="xs"
                        fallbackColor={article.author_color || '#0080ff'}
                      />
                      <span 
                        className="font-bold"
                        style={{ color: article.author_color || '#0080ff' }}
                      >
                        {article.author_name?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>User ID:</span>
                    <span className="terminal-green">USR{String(article.author_id).padStart(3, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Articles:</span>
                    <span className="terminal-yellow">{authorArticles.length + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="terminal-green">ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Active:</span>
                    <span className="terminal-orange">
                      {formatDate(article.published_at || article.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* More Articles by Author */}
              <div className="bloomberg-panel">
                <div className="flex items-center gap-2 mb-4 text-sm font-mono">
                  <span className="terminal-green">$</span>
                  <span className="terminal-orange">ls</span>
                  <span className="terminal-blue">--author={article.author_name?.toLowerCase()}</span>
                </div>
                
                {authorArticles.length > 0 ? (
                  <div className="space-y-2 pl-4">
                    {authorArticles.map((authorArticle) => (
                      <div key={authorArticle.id} className="text-xs">
                        <Link 
                          href={`/article/${authorArticle.slug}`}
                          className="terminal-yellow hover:terminal-orange transition-colors block"
                        >
                          <div className="flex items-center gap-2">
                            <span className="terminal-green font-mono">ART{String(authorArticle.id).padStart(3, '0')}</span>
                            <span className="flex-1 truncate">{authorArticle.title}</span>
                          </div>
                          <div className="terminal-gray text-xs ml-12">
                            {formatDate(authorArticle.published_at || authorArticle.created_at)}
                            {authorArticle.category_name && (
                              <span className="ml-2" style={{ color: authorArticle.category_color || '#ff8c00' }}>
                                [{authorArticle.category_name.toUpperCase()}]
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    ))}
                    
                    <div className="mt-4 pt-2 border-t border-bloomberg-gray/30">
                      <Link 
                        href={`/?author=${article.author_id}`}
                        className="text-xs terminal-orange hover:bg-bloomberg-darkgray px-2 py-1 rounded transition-colors"
                      >
                        VIEW ALL ARTICLES BY <span 
                          style={{ color: article.author_color || '#0080ff' }}
                          className="font-bold"
                        >
                          {article.author_name?.toUpperCase()}
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs terminal-gray pl-4">
                    No other articles by this author.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}