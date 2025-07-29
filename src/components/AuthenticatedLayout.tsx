'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home, LayoutDashboard, FolderOpen, Plus, Users, Lightbulb, UserCircle, Edit, Image, DollarSign } from 'lucide-react';
import TopBar from './TopBar';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { signOutUser } from '@/lib/firebase';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';

interface AuthenticatedUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  display_color?: string;
  currency1?: number;
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  currentPage?: string;
  titlePrefix?: string;
}

export default function AuthenticatedLayout({ children, requireAdmin = false, currentPage, titlePrefix }: AuthenticatedLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const { user: firebaseUser } = useFirebaseAuth();
  const { authenticatedFetch, logout: sessionLogout } = useAuthenticatedFetch();

  // Dynamic title
  useDynamicTitle(undefined, { 
    prefix: titlePrefix || 'Dashboard',
    showUser: true, 
    showNotifications: true 
  });

  useEffect(() => {
    checkAuth();
    fetchArticles();
    
    // Set current time with YYYY/MM/DD HH:MM:SS format
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

    return () => clearInterval(timeInterval);
  }, [firebaseUser]);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles');
      if (response.ok) {
        const data = await response.json();
        setArticles(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    }
  };

  const checkAuth = async () => {
    try {
      if (firebaseUser?.email) {
        const firebaseResponse = await authenticatedFetch('/api/auth/user-info');
        if (firebaseResponse.ok) {
          const data = await firebaseResponse.json();
          const userData = data.user;
          
          // Check admin requirement
          if (requireAdmin && userData.role !== 'admin') {
            router.push('/');
            return;
          }
          
          setUser(userData);
          setLoading(false);
          return;
        }
      }

      // No valid auth found - redirect to main page  
      router.push('/');
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Logout from both session and Firebase
      await sessionLogout();
      await signOutUser();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow flex items-center justify-center">
        <div className="terminal-orange">AUTHENTICATING...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-bloomberg-bg text-bloomberg-yellow">
      <TopBar 
        status={user.role === 'admin' ? 'ADMIN' : 'USER'}
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
            <div className="flex items-center gap-2">
              <span className="terminal-blue">USER:</span>
              <span 
                style={{ color: user?.display_color || 'var(--bloomberg-fallback-user-color)' }}
                className="font-bold"
              >
                {user?.display_name?.toUpperCase() || user?.username.toUpperCase()}
              </span>
            </div>
          </div>
        }
        secondaryNav={
          <>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className={`flex items-center gap-1 transition-colors ${
                currentPage === 'dashboard' || !currentPage
                  ? 'terminal-orange font-bold' 
                  : 'terminal-green hover:terminal-orange'
              }`}>
                <LayoutDashboard size={14} />
                DASHBOARD
              </Link>
              {user.role === 'admin' && (
                <Link href="/categories" className={`flex items-center gap-1 transition-colors ${
                  currentPage === 'categories'
                    ? 'terminal-orange font-bold' 
                    : 'terminal-green hover:terminal-orange'
                }`}>
                  <FolderOpen size={14} />
                  CATEGORIES
                </Link>
              )}
              <Link href="/new" className={`flex items-center gap-1 transition-colors ${
                currentPage === 'create'
                  ? 'terminal-orange font-bold' 
                  : 'terminal-green hover:terminal-orange'
              }`}>
                <Plus size={14} />
                NEW ARTICLE
              </Link>
              <Link href="/images" className={`flex items-center gap-1 transition-colors ${
                currentPage === 'images'
                  ? 'terminal-orange font-bold' 
                  : 'terminal-green hover:terminal-orange'
              }`}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image size={14} />
                IMAGES
              </Link>
              {user.role === 'admin' ? (
                <>
                  <Link href="/users" className={`flex items-center gap-1 transition-colors ${
                    currentPage === 'users'
                      ? 'terminal-orange font-bold' 
                      : 'terminal-green hover:terminal-orange'
                  }`}>
                    <Users size={14} />
                    USERS
                  </Link>
                  <Link href="/currency" className={`flex items-center gap-1 transition-colors ${
                    currentPage === 'currency'
                      ? 'terminal-orange font-bold' 
                      : 'terminal-green hover:terminal-orange'
                  }`}>
                    <DollarSign size={14} />
                    CURRENCY
                  </Link>
                </>
              ) : (
                <Link href="/suggest-category" className={`flex items-center gap-1 transition-colors ${
                  currentPage === 'suggest-category'
                    ? 'terminal-orange font-bold' 
                    : 'terminal-green hover:terminal-orange'
                }`}>
                  <Lightbulb size={14} />
                  SUGGEST CATEGORY
                </Link>
              )}
              <Link href="/profile" className={`flex items-center gap-1 transition-colors ${
                currentPage === 'profile'
                  ? 'terminal-orange font-bold' 
                  : 'terminal-green hover:terminal-orange'
              }`}>
                <UserCircle size={14} />
                PROFILE
              </Link>
              {currentPage === 'edit' && (
                <span className="flex items-center gap-1 terminal-orange font-bold">
                  <Edit size={14} />
                  EDIT
                </span>
              )}
            </nav>
          
            <div className="flex items-center gap-2 text-xs">
              <Link 
                href="/"
                className="flex items-center gap-1 terminal-blue hover:bg-bloomberg-darkgray px-2 py-1 rounded transition-colors"
              >
                <Home size={14} />
                SITE
              </Link>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-red-400 hover:bg-red-400/10 px-2 py-1 rounded transition-colors"
              >
                <LogOut size={14} />
                LOGOUT
              </button>
            </div>
          </>
        }
      />

      {/* Content with top padding for fixed header */}
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}