'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Plus, Bell, Settings } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import ThemeToggle from './ThemeToggle';

interface Article {
  id: number;
  title: string;
  slug: string;
  category_name?: string;
  category_color?: string;
  category_id?: number;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  article_id?: number;
  mention_id?: number;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

interface TopBarProps {
  status?: string;
  rightContent?: React.ReactNode;
  secondaryNav?: React.ReactNode;
  showNewArticleButton?: boolean;
}

export default function TopBar({ 
  status = "ONLINE",
  rightContent,
  secondaryNav,
  showNewArticleButton = false
}: TopBarProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const { authenticatedFetch, user, sessionToken, isCreatingSession } = useAuthenticatedFetch();
  const { isAdmin, adminUser } = useAdminAuth();
  
  // Current time state for centralized time display
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetch('/api/articles?limit=5')
      .then(res => res.json())
      .then(data => {
        console.log('TopBar articles fetch result:', data);
        setArticles(data || []);
      })
      .catch(err => console.error('Failed to fetch articles for marquee:', err));
  }, []);

  // Update time every second for centralized time display
  useEffect(() => {
    const formatTime = (date: Date) => {
      return date.getFullYear() + '/' + 
        String(date.getMonth() + 1).padStart(2, '0') + '/' + 
        String(date.getDate()).padStart(2, '0') + ' ' + 
        String(date.getHours()).padStart(2, '0') + ':' + 
        String(date.getMinutes()).padStart(2, '0') + ':' + 
        String(date.getSeconds()).padStart(2, '0');
    };
    
    setCurrentTime(formatTime(new Date()));
    
    const timeInterval = setInterval(() => {
      setCurrentTime(formatTime(new Date()));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Fetch notifications when user is authenticated and session is ready
  useEffect(() => {
    if (user && sessionToken && !isCreatingSession) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, sessionToken, isCreatingSession]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await authenticatedFetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Flipboard rotation effect
  useEffect(() => {
    if (articles.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % articles.length);
        setIsFlipping(false);
      }, 150); // Half of the flip animation duration
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [articles.length, isPaused]);

  // Handle click outside to close notification popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await authenticatedFetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authenticatedFetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Generate centralized right content
  const generateRightContent = () => {
    if (rightContent) return rightContent;

    return (
      <div className="flex items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="terminal-blue">STATUS:</span>
          <span className="terminal-green">{status}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="terminal-blue">ARTICLES:</span>
          <span className="terminal-yellow">{articles.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="terminal-blue">TIME:</span>
          <span className="terminal-green">{currentTime || '---'}</span>
        </div>
        
        {/* Admin controls */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link 
              href="/new" 
              className="flex items-center gap-1 terminal-green hover:bg-bloomberg-green hover:text-black px-2 py-1 rounded transition-colors font-bold"
            >
              <Plus size={14} />
              NEW
            </Link>
            
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bloomberg-bg border-b border-bloomberg-orange">
      {/* Main Terminal Bar with integrated marquee */}
      <div className="flex items-center justify-between px-4 py-2 bg-bloomberg-darkgray/50">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="terminal-orange font-bold font-mono text-sm tracking-wider hover:underline"
          >
            M2NP/TERMINAL
          </Link>
          
          {/* New Article Button */}
          {showNewArticleButton && (
            <Link 
              href="/new"
              className="flex items-center gap-1 bg-bloomberg-green text-bloomberg-bg px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider hover:bg-bloomberg-green/80 transition-colors"
            >
              <Plus size={12} />
              NEW
            </Link>
          )}
          
          {/* Flipboard Display */}
          <div className="flex-1 min-w-0 max-w-md mx-4">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="terminal-blue flex-shrink-0">LATEST:</span>
              <div 
                className="flex-1 min-w-0 h-6 perspective-1000"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div 
                  className={`flipboard-card ${isFlipping ? 'flipping' : ''}`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {articles.length > 0 ? (
                    <div className="flex items-center gap-2 h-full min-w-0">
                      <span className="terminal-orange font-bold flex-shrink-0">
                        {String(currentIndex + 1).padStart(2, '0')}
                      </span>
                      <span className="terminal-gray flex-shrink-0">|</span>
                      <Link 
                        href={`/article/${articles[currentIndex]?.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="terminal-yellow hover:terminal-orange transition-colors truncate flex-1 min-w-0"
                        title={articles[currentIndex]?.title}
                      >
                        {articles[currentIndex]?.title?.toUpperCase()}
                      </Link>
                      {articles[currentIndex]?.category_name && (
                        <span 
                          className="terminal-gray hover:bg-bloomberg-darkgray px-1 rounded transition-colors cursor-pointer text-xs flex-shrink-0"
                          style={{ color: articles[currentIndex]?.category_color || '#ff8c00' }}
                          onClick={() => {
                            window.location.href = `/?category=${articles[currentIndex]?.category_id}`;
                          }}
                          title={articles[currentIndex]?.category_name}
                        >
                          [{articles[currentIndex]?.category_name?.toUpperCase()}]
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 h-full">
                      <span className="terminal-gray">--</span>
                      <span className="terminal-gray">|</span>
                      <span className="terminal-gray">NO ARTICLES AVAILABLE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 flex-shrink-0">
          {generateRightContent()}
          
          {/* Theme Toggle */}
          <ThemeToggle size="sm" />
          
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotificationPopover(!showNotificationPopover)}
              className="relative flex items-center gap-2 terminal-blue hover:terminal-orange transition-colors p-1"
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

              {/* Notification Popover */}
              {showNotificationPopover && (
                <div className="absolute right-0 top-8 w-80 bg-bloomberg-bg border border-bloomberg-orange rounded shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-bloomberg-gray">
                    <div className="flex items-center justify-between">
                      <h3 className="terminal-orange font-bold text-sm">NOTIFICATIONS</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="terminal-blue hover:terminal-orange transition-colors text-xs"
                        >
                          Mark All Read
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center terminal-gray text-sm">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-bloomberg-gray hover:bg-bloomberg-darkgray/50 transition-colors cursor-pointer ${
                            !notification.is_read ? 'bg-bloomberg-darkgray/20' : ''
                          }`}
                          onClick={() => !notification.is_read && markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-bloomberg-orange rounded-full mt-1 flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="terminal-yellow font-bold text-xs mb-1 truncate">
                                {notification.title}
                              </div>
                              <div className="terminal-gray text-xs mb-2 line-clamp-2">
                                {notification.message}
                              </div>
                              <div className="terminal-blue text-xs">
                                {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-bloomberg-gray">
                    <Link
                      href="/notifications"
                      className="terminal-blue hover:terminal-orange transition-colors text-xs block text-center"
                      onClick={() => setShowNotificationPopover(false)}
                    >
                      View All Notifications →
                    </Link>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
      
      {/* Secondary Navigation Bar */}
      {secondaryNav && (
        <div className="flex items-center justify-between px-4 py-2 bg-bloomberg-bg/80">
          {secondaryNav}
        </div>
      )}
    </header>
  );
}