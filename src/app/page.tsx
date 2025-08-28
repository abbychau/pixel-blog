'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import AuthButtons from '@/components/AuthButtons';
import { Plus, Settings, FolderOpen, FileText, Clock, Database, Edit, Trash2, Users, DollarSign, UserCircle, Image, Lightbulb } from 'lucide-react';
import TopBar from '@/components/TopBar';
import Avatar from '@/components/Avatar';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

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
  author_avatar?: string;
  status: string;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}

function SearchParamsHandler({ 
  setSelectedAuthor, 
  setSelectedCategory 
}: { 
  setSelectedAuthor: (author: string) => void;
  setSelectedCategory: (category: string) => void; 
}) {
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params
  useEffect(() => {
    const authorParam = searchParams.get('author');
    const categoryParam = searchParams.get('category');
    if (authorParam) {
      setSelectedAuthor(authorParam);
    }
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams, setSelectedAuthor, setSelectedCategory]);

  return null; // This component only handles side effects
}

function HomePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Display toggle states
  const [showActions, setShowActions] = useState(false);
  const [showDraftStatus, setShowDraftStatus] = useState(false);
  
  // Admin states
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // Function to clear all filters and update URL
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedAuthor('');
    router.push('/');
  };

  // Function to clear author filter and update URL
  const clearAuthorFilter = () => {
    setSelectedAuthor('');
    const url = new URL(window.location.href);
    url.searchParams.delete('author');
    router.push(url.pathname + (url.search || ''));
  };

  // Function to clear category filter and update URL
  const clearCategoryFilter = () => {
    setSelectedCategory('');
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    router.push(url.pathname + (url.search || ''));
  };
  const [confirmDelete, setConfirmDelete] = useState<{id: number, title: string} | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Admin auth
  const { isAdmin, adminUser } = useAdminAuth();
  const { user: firebaseUser } = useFirebaseAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();

  // Dynamic title
  useDynamicTitle(undefined, { 
    showUser: isAdmin || !!firebaseUser, 
    showNotifications: isAdmin || !!firebaseUser 
  });

  // Helper function for status messages (admin only)
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  useEffect(() => {
    // Set current time on client mount
    setCurrentTime(new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/'));
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/'));
    }, 1000);

    // Fetch articles and categories - use admin endpoints if admin
    const fetchArticles = async () => {
      try {
        const [articlesRes, categoriesRes] = await Promise.all([
          isAdmin ? authenticatedFetch('/api/admin/articles') : fetch('/api/articles'),
          fetch('/api/admin/categories')
        ]);
        
        if (!articlesRes.ok) {
          console.error('Failed to fetch articles:', articlesRes.status);
          setArticles([]);
          setLoading(false);
          return;
        }
        
        const articlesData = await articlesRes.json();
        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
        
        console.log('🔍 API Response:', {
          endpoint: isAdmin ? '/api/admin/articles' : '/api/articles',
          articlesCount: Array.isArray(articlesData) ? articlesData.length : 'not array',
          categoriesCount: Array.isArray(categoriesData) ? categoriesData.length : 'not array',
          isAdmin,
          sampleArticles: Array.isArray(articlesData) ? articlesData.slice(0, 2).map(a => ({ 
            title: a.title, 
            status: a.status 
          })) : 'none'
        });
        
        setArticles(Array.isArray(articlesData) ? articlesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setArticles([]);
        setCategories([]);
        setLoading(false);
      }
    };
    
    fetchArticles();

    return () => clearInterval(timeInterval);
  }, [isAdmin, authenticatedFetch]);

  // Filter and sort articles
  useEffect(() => {
    console.log('🔍 Filtering articles:', {
      totalArticles: articles.length,
      searchTerm,
      selectedCategory,
      selectedAuthor,
      isAdmin
    });
    
    let filtered = [...articles];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(article => 
        article.category_id === parseInt(selectedCategory)
      );
    }

    // Author filter
    if (selectedAuthor) {
      filtered = filtered.filter(article => 
        article.author_id === parseInt(selectedAuthor)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      if (sortBy === 'title') {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      } else if (sortBy === 'status') {
        aValue = a.status;
        bValue = b.status;
      } else {
        aValue = new Date(a.published_at || a.created_at);
        bValue = new Date(b.published_at || b.created_at);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log('🔍 Filtered articles result:', {
      filteredCount: filtered.length,
      sampleTitles: filtered.slice(0, 3).map(a => a.title)
    });
    
    setFilteredArticles(filtered);
  }, [articles, searchTerm, selectedCategory, selectedAuthor, sortBy, sortOrder]);

  const toggleSort = (field: 'title' | 'date' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Admin delete functions
  const handleDeleteRequest = (id: number, title: string) => {
    setConfirmDelete({ id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const response = await authenticatedFetch(`/api/admin/articles/${confirmDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setArticles(articles.filter(article => article.id !== confirmDelete.id));
        showStatus('ARTICLE DELETED SUCCESSFULLY', 'success');
      } else {
        showStatus('ERROR: Failed to delete article', 'error');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow">
      <TopBar 
        showNewArticleButton={!!firebaseUser}
        rightContent={
          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="terminal-blue">ARTICLES:</span>
              <span className="terminal-yellow">{articles.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="terminal-blue">TIME:</span>
              <span className="terminal-green">{currentTime || '---'}</span>
            </div>
            {(isAdmin || firebaseUser) && (
              <div className="flex items-center gap-2">
                <span className="terminal-blue">USER:</span>
                <Link
                  href="/profile"
                  style={{ color: adminUser?.display_color || firebaseUser?.displayName ? 'var(--bloomberg-fallback-user-color)' : '#0080ff' }}
                  className="font-bold hover:underline transition-colors"
                  title="View Profile"
                >
                  {(adminUser?.display_name || firebaseUser?.displayName || adminUser?.username || 'USER').toUpperCase()}
                </Link>
              </div>
            )}
          </div>
        }
        secondaryNav={
          (isAdmin || firebaseUser) ? (
            <>
              <nav className="flex gap-4 text-sm">
                <Link href="/" className="flex items-center gap-1 terminal-orange font-bold">
                  <Database size={14} />
                  DASHBOARD
                </Link>
                {isAdmin && (
                  <Link href="/categories" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                    <FolderOpen size={14} />
                    CATEGORIES
                  </Link>
                )}
                <Link href="/new" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                  <Plus size={14} />
                  NEW ARTICLE
                </Link>
                <Link href="/images" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image size={14} />
                  IMAGES
                </Link>
                {isAdmin ? (
                  <>
                    <Link href="/users" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                      <Users size={14} />
                      USERS
                    </Link>
                    <Link href="/currency" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                      <DollarSign size={14} />
                      CURRENCY
                    </Link>
                  </>
                ) : (
                  <Link href="/suggest-category" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                    <Lightbulb size={14} />
                    SUGGEST CATEGORY
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-1 terminal-green hover:terminal-orange transition-colors">
                  <UserCircle size={14} />
                  PROFILE
                </Link>
              </nav>
            </>
          ) : undefined
        }
      />

      {/* Main Content with top padding for fixed header */}
      <div className={`pt-20 px-2 pb-8 md:px-8`}>
        
        {/* Status Message for admins */}
        {isAdmin && statusMessage && (
          <div className={`mb-4 p-3 rounded border ${
            statusType === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
            statusType === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' :
            'bg-blue-500/10 border-blue-500 text-blue-400'
          }`}>
            {statusMessage}
          </div>
        )}
      
      <main>
        {/* Terminal Command Prompt Style */}
        <div className="mb-6 font-mono">
          <div className="flex items-center gap-2 text-sm">
            <span className="terminal-green">$</span>
            <span className="terminal-orange">ls</span>
            <span className="terminal-blue">-la</span>
            <span className="terminal-yellow">/articles</span>
          </div>
          <div className="text-xs terminal-gray mt-1">
            drwxr-xr-x {articles.length} articles found • {filteredArticles.filter(a => a.status === 'published').length} published • last modified: {articles[0] ? formatDate(articles[0].published_at || articles[0].created_at) : 'never'}
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const categoryCount = articles.filter(a => a.category_id === category.id && a.status === 'published').length;
                const isSelected = selectedCategory === category.id.toString();
                
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      if (isSelected) {
                        // Deselect if already selected and update URL
                        clearCategoryFilter();
                      } else {
                        // Select this category and update URL
                        const url = new URL(window.location.href);
                        url.searchParams.set('category', category.id.toString());
                        router.push(url.pathname + url.search);
                        setSelectedCategory(category.id.toString());
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-mono border rounded transition-colors group ${
                      isSelected 
                        ? 'border-bloomberg-orange bg-bloomberg-orange/20 ring-1 ring-bloomberg-orange/50' 
                        : 'border-bloomberg-gray hover:bg-bloomberg-darkgray/30'
                    }`}
                  >
                    <FolderOpen size={12} style={{ color: category.color || '#ff8c00' }} />
                    <span
                      className={`transition-colors ${
                        isSelected 
                          ? 'terminal-orange font-bold' 
                          : 'group-hover:terminal-orange'
                      }`}
                      style={{ color: isSelected ? '#ff8c00' : (category.color || '#ff8c00') }}
                    >
                      {category.name.toUpperCase()}
                    </span>
                    <span className={isSelected ? 'terminal-orange' : 'terminal-gray'}>
                      ({categoryCount})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bloomberg-panel mb-8">
          <div className="flex justify-between items-center mb-4 border-b border-bloomberg-gray pb-2">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold terminal-orange tracking-wider font-mono flex items-center gap-2">
                {selectedCategory ? (
                  <>
                    <FolderOpen size={16} style={{ color: categories.find(c => c.id === parseInt(selectedCategory))?.color || '#ff8c00' }} />
                    {categories.find(c => c.id === parseInt(selectedCategory))?.name?.toUpperCase().replace(/\s+/g, '_') || 'CATEGORY'}
                  </>
                ) : (
                  <>
                    <Database size={16} className="terminal-orange" />
                    ARTICLE_DATABASE
                  </>
                )}
              </h2>
              <div className="text-xs terminal-gray">
                [{filteredArticles.length}/{articles.length} entries]
              </div>
            </div>

          </div>
          
          {/* Terminal Command Interface */}
          <div className="mb-4 bg-bloomberg-darkgray border border-bloomberg-gray p-3 font-mono">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="terminal-green">$</span>
              <span className="terminal-orange">grep</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-bloomberg-yellow text-xs flex-1 min-w-0"
                placeholder="search_pattern"
                style={{ minWidth: '120px' }}
              />
              <span className="terminal-blue">|</span>
              <span className="terminal-orange">filter</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    // Deselect category and update URL
                    clearCategoryFilter();
                  } else {
                    // Select category and update URL
                    const url = new URL(window.location.href);
                    url.searchParams.set('category', value);
                    router.push(url.pathname + url.search);
                    setSelectedCategory(value);
                  }
                }}
                className="bg-transparent border-none outline-none text-bloomberg-yellow text-xs"
              >
                <option value="" className="bg-bloomberg-bg text-bloomberg-yellow hover:bg-bloomberg-orange hover:text-bloomberg-bg">--all</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-bloomberg-bg text-bloomberg-yellow hover:bg-bloomberg-orange hover:text-bloomberg-bg">
                    --{category.name.toLowerCase()}
                  </option>
                ))}
              </select>
              {selectedAuthor && (
                <>
                  <span className="terminal-blue">|</span>
                  <span className="terminal-orange">author</span>
                  <span className="terminal-yellow">--{articles.find(a => a.author_id === parseInt(selectedAuthor))?.author_name?.toLowerCase() || 'unknown'}</span>
                  <button
                    onClick={clearAuthorFilter}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors ml-1"
                  >
                    ✕
                  </button>
                </>
              )}
              <span className="terminal-blue">|</span>
              <span className="terminal-orange">sort</span>
              <button
                onClick={() => toggleSort('title')}
                className={`text-xs px-1 transition-colors ${
                  sortBy === 'title' 
                    ? 'terminal-yellow' 
                    : 'terminal-gray hover:terminal-orange'
                }`}
              >
                --title{sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => toggleSort('date')}
                className={`text-xs px-1 transition-colors ${
                  sortBy === 'date' 
                    ? 'terminal-yellow' 
                    : 'terminal-gray hover:terminal-orange'
                }`}
              >
                --date{sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              {isAdmin && (
                <button
                  onClick={() => toggleSort('status')}
                  className={`text-xs px-1 transition-colors ${
                    sortBy === 'status' 
                      ? 'terminal-yellow' 
                      : 'terminal-gray hover:terminal-orange'
                  }`}
                >
                  --status{sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              )}
              {isAdmin && (
                <>
                  <span className="terminal-blue">|</span>
                  <span className="terminal-orange">view</span>
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className={`text-xs px-1 transition-colors ${
                      showActions ? 'terminal-green' : 'terminal-gray hover:terminal-orange'
                    }`}
                  >
                    --actions{showActions ? '✓' : '✗'}
                  </button>
                  <button
                    onClick={() => setShowDraftStatus(!showDraftStatus)}
                    className={`text-xs px-1 transition-colors ${
                      showDraftStatus ? 'terminal-green' : 'terminal-gray hover:terminal-orange'
                    }`}
                  >
                    --drafts{showDraftStatus ? '✓' : '✗'}
                  </button>
                </>
              )}
              {(searchTerm || selectedCategory || selectedAuthor) && (
                <>
                  <span className="terminal-blue">|</span>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    clear
                  </button>
                </>
              )}
            </div>
            {(searchTerm || selectedCategory || selectedAuthor) && (
              <div className="text-xs terminal-gray">
                {'>'} filtering {articles.length} entries → {filteredArticles.length} matches
                {searchTerm && ` [pattern: "${searchTerm}"]`}
                {selectedCategory && ` [category: ${categories.find(c => c.id === parseInt(selectedCategory))?.name}]`}
                {selectedAuthor && ` [author: ${articles.find(a => a.author_id === parseInt(selectedAuthor))?.author_name}]`}
              </div>
            )}
          </div>

          {loading ? (
            <div className="terminal-orange">LOADING MARKET DATA...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="bloomberg-table w-full">
                <thead>
                  <tr>
                    {isAdmin && <th className="w-16">ID</th>}
                    <th className="text-left">TITLE</th>
                    <th className="w-40">CATEGORY</th>
                    <th className="w-32">AUTHOR</th>
                    {isAdmin && showDraftStatus && <th className="w-20">STATUS</th>}
                    <th className="w-32">DATE</th>
                    {isAdmin && showActions && <th className="w-32">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => (
                    <tr 
                      key={article.id} 
                      className={`${!isAdmin ? 'cursor-pointer hover:bg-bloomberg-darkgray/30' : ''} transition-colors`}
                      onClick={!isAdmin ? () => window.open(`/article/${article.slug}`, '_blank', 'noopener,noreferrer') : undefined}
                    >
                      {isAdmin && (
                        <td className="font-mono terminal-blue">
                          {String(article.id).padStart(3, '0')}
                        </td>
                      )}
                      <td className="transition-colors">
                        <Link
                          href={`/article/${article.slug}`}
                          className="font-bold hover:terminal-orange transition-colors block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {article.title}
                        </Link>
                        {article.excerpt && (
                          <div className="text-xs terminal-green mt-1 opacity-80">
                            {article.excerpt.substring(0, isAdmin ? 80 : 120)}...
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
                          <span className="text-xs terminal-gray">{isAdmin ? 'NONE' : 'UNCATEGORIZED'}</span>
                        )}
                      </td>
                      <td className="text-center text-sm">
                        <div className="flex items-center gap-2">
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            {article.author_name?.toUpperCase() || 'UNKNOWN'}
                          </Link>
                        </div>
                      </td>
                      {isAdmin && showDraftStatus && (
                        <td className="text-center">
                          <span className={article.status === 'published' ? 'terminal-green' : 'terminal-blue'}>
                            {article.status.toUpperCase()}
                          </span>
                        </td>
                      )}
                      <td className="text-center font-mono text-xs">
                        {article.published_at ? formatDate(article.published_at) : formatDate(article.created_at)}
                      </td>
                      {isAdmin && showActions && (
                        <td className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/edit/${article.id}`}
                              className="p-1 terminal-orange hover:bg-bloomberg-darkgray rounded transition-colors"
                              title="Edit Article"
                            >
                              <Edit size={14} />
                            </Link>
                            <button
                              onClick={() => handleDeleteRequest(article.id, article.title)}
                              className="p-1 text-red-500 hover:bg-bloomberg-darkgray rounded transition-colors"
                              title="Delete Article"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredArticles.length === 0 && !loading && (
                <div className="text-center py-8 terminal-yellow">
                  {searchTerm || selectedCategory || selectedAuthor ? (
                    <>
                      NO ARTICLES MATCH YOUR FILTERS
                      <br />
                      <button 
                        onClick={clearAllFilters}
                        className="terminal-orange hover:underline mt-2"
                      >
                        CLEAR FILTERS
                      </button>
                    </>
                  ) : (
                    'NO ARTICLES AVAILABLE'
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bloomberg-panel">
            <div className="flex items-center gap-2 mb-3 text-sm font-mono">
              <span className="terminal-green">$</span>
              <span className="terminal-orange">blog</span>
              <span className="terminal-blue">--status</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono pl-4">
              <div className="flex justify-between">
                <span>Total Articles:</span>
                <span className="terminal-yellow">{articles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Currently Showing:</span>
                <span className="terminal-green">{filteredArticles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Published:</span>
                <span className="terminal-green">{filteredArticles.filter(a => a.status === 'published').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Drafts:</span>
                <span className="terminal-yellow">{filteredArticles.filter(a => a.status === 'draft').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Categories:</span>
                <span className="terminal-blue">{categories.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="terminal-orange">v2.1.0</span>
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

      {/* Delete Confirmation Modal (Admin only) */}
      {isAdmin && confirmDelete && (
        <div className="fixed inset-0 bg-bloomberg-bg/80 flex items-center justify-center z-50 p-4" onClick={handleDeleteCancel}>
          <div className="max-w-md bg-bloomberg-bg border border-red-500 rounded p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-400 mb-2">DELETE ARTICLE</h3>
              <p className="text-sm terminal-gray mb-2">
                Are you sure you want to delete:
              </p>
              <p className="text-sm terminal-yellow font-bold break-words">
                &quot;{confirmDelete.title}&quot;
              </p>
              <p className="text-xs text-red-400 mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 py-2 px-4 border border-bloomberg-gray text-bloomberg-gray hover:bg-bloomberg-darkgray transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2 px-4 bg-red-500 text-black hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                {deleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Search params handler wrapped in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler 
          setSelectedAuthor={setSelectedAuthor}
          setSelectedCategory={setSelectedCategory}
        />
      </Suspense>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePage />
    </Suspense>
  );
}