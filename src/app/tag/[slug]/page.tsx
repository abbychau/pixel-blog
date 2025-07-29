'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AuthButtons from '@/components/AuthButtons';
import TopBar from '@/components/TopBar';
import { Plus, Settings } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  article_count: number;
  created_at: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  author_id: number;
  author_name?: string;
  author_color?: string;
  status: string;
  published_at?: string;
  created_at: string;
}

export default function TagPage() {
  const params = useParams();
  const [tag, setTag] = useState<Tag | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!params.slug) {
      return;
    }

    // Fetch tag data and all articles for marquee
    Promise.all([
      fetch(`/api/tags/${params.slug}`),
      fetch('/api/articles')
    ])
    .then(async ([tagRes, articlesRes]) => {
      if (!tagRes.ok) {
        throw new Error('Tag not found');
      }
      
      const tagData = await tagRes.json();
      const articlesData = articlesRes.ok ? await articlesRes.json() : [];
      
      setTag(tagData.tag);
      setArticles(tagData.articles);
      setAllArticles(articlesData);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-bloomberg-yellow p-8">
        <div className="terminal-orange">LOADING TAG DATA...</div>
      </div>
    );
  }

  if (error || !tag) {
    return (
      <div className="min-h-screen bg-black text-bloomberg-yellow p-8">
        <div className="bloomberg-panel">
          <h1 className="text-2xl font-bold terminal-orange mb-4">ERROR 404</h1>
          <p className="terminal-yellow mb-4">TAG NOT FOUND IN DATABASE</p>
          <Link href="/" className="terminal-orange hover:bg-bloomberg-darkgray px-4 py-2 rounded transition-colors">
            ← RETURN TO MAIN TERMINAL
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-bloomberg-yellow">
      <TopBar status="BROWSING" />

      {/* Main Content with top padding for fixed header */}
      <div className="pt-16 px-8 pb-8">
        <main>
          {/* Terminal Command Prompt Style */}
          <div className="mb-6 font-mono">
            <div className="flex items-center gap-2 text-sm">
              <span className="terminal-green">$</span>
              <span className="terminal-orange">ls</span>
              <span className="terminal-blue">-la</span>
              <span className="terminal-yellow">/tags/{tag.slug}</span>
            </div>
            <div className="text-xs terminal-gray mt-1">
              drwxr-xr-x {articles.length} articles tagged with #{tag.name} • created: {formatDate(tag.created_at)}
            </div>
          </div>

          <div className="bloomberg-panel mb-8">
            <div className="flex justify-between items-center mb-4 border-b border-bloomberg-gray pb-2">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold terminal-orange tracking-wider font-mono">
                  TAG: 
                  <span className="ml-2 px-3 py-1 border rounded" style={{ color: tag.color, borderColor: tag.color }}>
                    #{tag.name.toUpperCase()}
                  </span>
                </h2>
                <div className="text-xs terminal-gray">
                  [{articles.length} articles]
                </div>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="terminal-green">TOTAL: {tag.article_count}</span>
                <span className="terminal-yellow">SHOWING: {articles.length}</span>
              </div>
            </div>

            {articles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="bloomberg-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">TITLE</th>
                      <th className="w-40">CATEGORY</th>
                      <th className="w-32">AUTHOR</th>
                      <th className="w-32">DATE</th>
                      <th className="w-20">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr 
                        key={article.id} 
                        className="cursor-pointer hover:bg-bloomberg-darkgray/30 transition-colors"
                        onClick={() => window.open(`/article/${article.slug}`, '_blank', 'noopener,noreferrer')}
                      >
                        <td className="hover:terminal-orange transition-colors">
                          <div className="font-bold">{article.title}</div>
                          {article.excerpt && (
                            <div className="text-xs terminal-green mt-1 opacity-80">
                              {article.excerpt.substring(0, 120)}...
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          {article.category_name ? (
                            <Link
                              href={`/?category=${article.category_id}`}
                              className="px-3 py-1 text-xs font-bold rounded whitespace-nowrap hover:bg-bloomberg-darkgray/50 transition-colors inline-block"
                              style={{ color: article.category_color || '#ff8c00' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {article.category_name.toUpperCase()}
                            </Link>
                          ) : (
                            <span className="text-xs terminal-gray">UNCATEGORIZED</span>
                          )}
                        </td>
                        <td className="text-center text-sm">
                          <span 
                            className="font-mono font-bold"
                            style={{ color: article.author_color || '#0080ff' }}
                          >
                            {article.author_name?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="text-center font-mono text-xs">
                          {article.published_at ? formatDate(article.published_at) : formatDate(article.created_at)}
                        </td>
                        <td className="text-center">
                          <span className={article.status === 'published' ? 'terminal-green' : 'terminal-blue'}>
                            {article.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 terminal-yellow">
                NO ARTICLES FOUND WITH THIS TAG
                <br />
                <Link 
                  href="/"
                  className="terminal-orange hover:underline mt-2 inline-block"
                >
                  BROWSE ALL ARTICLES
                </Link>
              </div>
            )}
          </div>

          {/* Terminal Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bloomberg-panel">
              <div className="flex items-center gap-2 mb-3 text-sm font-mono">
                <span className="terminal-green">$</span>
                <span className="terminal-orange">tag</span>
                <span className="terminal-blue">--info</span>
              </div>
              <div className="space-y-1 text-xs font-mono pl-4">
                <div className="flex justify-between">
                  <span>Tag Name:</span>
                  <span className="terminal-yellow" style={{ color: tag.color }}>#{tag.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slug:</span>
                  <span className="terminal-green">{tag.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span>Articles:</span>
                  <span className="terminal-yellow">{tag.article_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="terminal-orange">{formatDate(tag.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Color:</span>
                  <span style={{ color: tag.color }}>{tag.color}</span>
                </div>
              </div>
            </div>

            <div className="bloomberg-panel">
              <div className="flex items-center gap-2 mb-3 text-sm font-mono">
                <span className="terminal-green">$</span>
                <span className="terminal-orange">whoami</span>
              </div>
              <div className="pl-4">
                <AuthButtons />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}