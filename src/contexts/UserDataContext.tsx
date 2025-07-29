'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface UserData {
  display_name?: string;
  username?: string;
  id?: number;
  role?: string;
  display_color?: string;
}

interface UserDataContextType {
  userInfo: UserData | null;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user: firebaseUser, authenticatedFetch, sessionToken, isCreatingSession } = useAuthenticatedFetch();
  const [userInfo, setUserInfo] = useState<UserData | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    if (!firebaseUser) {
      setUserInfo(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userResponse = await authenticatedFetch('/api/auth/user-info');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData.user);
      } else {
        setError('Failed to fetch user info');
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    if (!firebaseUser || !userInfo) return;

    try {
      const notifResponse = await authenticatedFetch('/api/admin/notifications?limit=1');
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setUnreadCount(notifData.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Initial data fetch when user logs in and session is ready
  useEffect(() => {
    if (firebaseUser && sessionToken && !isCreatingSession) {
      // Session is ready, safe to fetch user info
      fetchUserInfo();
    } else if (!firebaseUser) {
      // User logged out
      setUserInfo(null);
      setUnreadCount(0);
    }
    // If firebaseUser exists but sessionToken is not ready or isCreatingSession is true, wait
  }, [firebaseUser, sessionToken, isCreatingSession]);

  // Fetch notifications once we have user info
  useEffect(() => {
    if (userInfo) {
      refreshNotifications();
    }
  }, [userInfo]);

  // Poll for notifications every 5 minutes for logged in users (reduced frequency)
  useEffect(() => {
    if (!userInfo) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [userInfo]);

  const value = {
    userInfo,
    unreadCount,
    loading,
    error,
    refreshNotifications
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}