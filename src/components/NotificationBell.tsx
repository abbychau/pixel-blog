'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  article_id?: number;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { authenticatedFetch } = useAuthenticatedFetch();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/admin/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await authenticatedFetch(`/api/admin/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-bloomberg-yellow hover:bg-bloomberg-darkgray rounded transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-black border border-bloomberg-gray rounded shadow-lg z-50">
          <div className="p-3 border-b border-bloomberg-gray">
            <div className="flex justify-between items-center">
              <h3 className="font-bold terminal-orange">NOTIFICATIONS</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs terminal-blue hover:terminal-orange transition-colors"
                  >
                    MARK ALL READ
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-bloomberg-gray hover:text-bloomberg-yellow"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center terminal-gray">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center terminal-gray">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-bloomberg-gray/30 hover:bg-bloomberg-darkgray/30 transition-colors ${
                    !notification.is_read ? 'bg-bloomberg-darkgray/20' : ''
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold ${
                        !notification.is_read ? 'terminal-yellow' : 'terminal-gray'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className="text-xs terminal-gray mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs terminal-blue mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-bloomberg-orange rounded-full mt-1"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-bloomberg-gray">
              <button
                onClick={fetchNotifications}
                className="text-xs terminal-blue hover:terminal-orange transition-colors w-full text-center"
              >
                REFRESH
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}