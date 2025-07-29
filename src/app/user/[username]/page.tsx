'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import TopBar from '@/components/TopBar';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  display_color?: string;
  created_at: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category_name?: string;
  category_color?: string;
  status: string;
  published_at?: string;
  created_at: string;
}

export default function UserPage() {
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.username) {
      return;
    }

    // Fetch user data and their articles
    Promise.all([
      fetch(`/api/users/${params.username}`),
      fetch(`/api/users/${params.username}/articles`)
    ])
    .then(async ([userRes, articlesRes]) => {
      if (!userRes.ok) {
        throw new Error('User not found');
      }
      
      const userData = await userRes.json();
      const articlesData = articlesRes.ok ? await articlesRes.json() : [];
      
      setUser(userData);
      setArticles(articlesData);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [params.username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow p-8">
        <div className="terminal-orange">LOADING USER DATA...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow p-8">
        <div className="bloomberg-panel">
          <h1 className="text-2xl font-bold terminal-orange mb-4">ERROR 404</h1>
          <p className="terminal-yellow mb-4">USER NOT FOUND IN DATABASE</p>
          <Link href="/" className="terminal-orange hover:bg-bloomberg-darkgray px-4 py-2 rounded transition-colors">
            ← RETURN TO MAIN TERMINAL
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow">
      <TopBar status="VIEWING" />

      {/* Main Content with top padding for fixed header */}
      <div className="pt-16 px-8 pb-8">
        <main>
          {/* Terminal Command Prompt Style */}
          <div className="mb-6 font-mono">
            <div className="flex items-center gap-2 text-sm">
              <span className="terminal-green">$</span>
              <span className="terminal-orange">whoami</span>
              <span className="terminal-blue">@{user.username}</span>
            </div>
            <div className="text-xs terminal-gray mt-1">
              {user.role} user • {articles.length} published articles • member since: {formatDate(user.created_at)}
            </div>
          </div>

          <div className="bloomberg-panel mb-8">
            <div className="flex justify-between items-center mb-4 border-b border-bloomberg-gray pb-2">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold terminal-orange tracking-wider font-mono">
                  USER PROFILE
                </h2>
                <div className="text-xs terminal-gray">
                  [@{user.username}]
                </div>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="terminal-green">ROLE: {user.role.toUpperCase()}</span>
                <span className="terminal-yellow">ARTICLES: {articles.length}</span>
              </div>
            </div>

            {/* User Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">USER INFO</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span>Display Name:</span>
                    <span 
                      style={{ color: user.display_color || 'var(--bloomberg-fallback-user-color)' }}
                      className="font-bold"
                    >
                      {user.display_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Username:</span>
                    <span className="terminal-blue">@{user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="terminal-green">{user.role.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Member Since:</span>
                    <span className="terminal-orange">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <h3 className="text-lg font-bold terminal-orange mb-4">PUBLISHED ARTICLES</h3>
                {articles.length > 0 ? (
                  <div className="space-y-2">
                    {articles.map((article) => (
                      <Link
                        key={article.id}
                        href={`/article/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border border-bloomberg-gray hover:bg-bloomberg-darkgray/30 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-bold terminal-yellow hover:terminal-orange transition-colors">
                              {article.title}
                            </h4>
                            {article.excerpt && (
                              <p className="text-xs terminal-gray mt-1">
                                {article.excerpt.substring(0, 100)}...
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span className="terminal-green">
                                {formatDate(article.published_at || article.created_at)}
                              </span>
                              {article.category_name && (
                                <span style={{ color: article.category_color || '#ff8c00' }}>
                                  [{article.category_name.toUpperCase()}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 terminal-gray">
                    No published articles yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}