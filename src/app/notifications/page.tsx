'use client';

import { useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import TopBar from '@/components/TopBar';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import Link from 'next/link';

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

export default function NotificationHistoryPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const { authenticatedFetch, user } = useAuthenticatedFetch();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/notifications?limit=100');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-black text-bloomberg-white">
      <TopBar />
      
      <main className="pt-20 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="terminal-blue hover:terminal-orange transition-colors p-2 rounded border border-bloomberg-gray hover:border-bloomberg-orange"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="terminal-orange font-bold text-2xl font-mono">NOTIFICATION HISTORY</h1>
                <p className="terminal-gray text-sm mt-1">
                  {notifications.length} total notifications • {unreadCount} unread
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 bg-bloomberg-green text-black px-4 py-2 rounded font-mono text-sm font-bold hover:bg-bloomberg-green/80 transition-colors"
              >
                <CheckCheck size={16} />
                Mark All Read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mb-6 bg-bloomberg-darkgray rounded p-1">
            {(['all', 'unread', 'read'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded font-mono text-sm font-bold uppercase transition-colors ${
                  filter === filterType
                    ? 'bg-bloomberg-orange text-black'
                    : 'terminal-gray hover:terminal-white'
                }`}
              >
                {filterType}
                {filterType === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="terminal-orange font-mono">Loading notifications...</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 bg-bloomberg-darkgray/20 rounded border border-bloomberg-gray">
                <div className="terminal-gray font-mono text-lg mb-2">
                  {filter === 'all' ? 'No notifications found' : 
                   filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
                </div>
                <p className="terminal-gray text-sm">
                  {filter === 'all' ? 'You have no notifications yet.' : 
                   filter === 'unread' ? 'All caught up!' : 'No read notifications to show.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-bloomberg-darkgray/20 border rounded p-4 transition-all hover:bg-bloomberg-darkgray/30 ${
                    !notification.is_read 
                      ? 'border-bloomberg-orange shadow-sm' 
                      : 'border-bloomberg-gray'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div className="flex-shrink-0 pt-1">
                      {!notification.is_read ? (
                        <div className="w-3 h-3 bg-bloomberg-orange rounded-full"></div>
                      ) : (
                        <div className="w-3 h-3 border border-bloomberg-gray rounded-full"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className={`font-bold font-mono text-sm ${
                          !notification.is_read ? 'terminal-yellow' : 'terminal-gray'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="terminal-blue text-xs font-mono">
                            {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString()}
                          </span>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="terminal-blue hover:terminal-orange transition-colors p-1 rounded"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className="terminal-gray text-sm mb-3 leading-relaxed">
                        {notification.message}
                      </p>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className={`px-2 py-1 rounded ${
                          notification.type === 'mention' ? 'bg-blue-600/20 text-blue-400' :
                          notification.type === 'article_published' ? 'bg-green-600/20 text-green-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {notification.type.toUpperCase()}
                        </span>
                        
                        {notification.read_at && (
                          <span className="terminal-gray">
                            Read on {new Date(notification.read_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer info */}
          <div className="mt-8 text-center">
            <p className="terminal-gray text-xs font-mono">
              Notifications are automatically deleted after 30 days
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}