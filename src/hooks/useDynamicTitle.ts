'use client';

import { useEffect } from 'react';
import { useUserData } from '@/contexts/UserDataContext';

interface TitleOptions {
  prefix?: string;
  suffix?: string;
  showNotifications?: boolean;
  showUser?: boolean;
}

export function useDynamicTitle(
  baseTitle: string = 'M2NP/TERMINAL',
  options: TitleOptions = {}
) {
  const { userInfo, unreadCount } = useUserData();

  const {
    prefix = '',
    suffix = '',
    showNotifications = false,
    showUser = false
  } = options;

  // Build and set the document title
  useEffect(() => {
    let title = baseTitle;
    
    // Add prefix (like article title, admin section, etc.)
    if (prefix) {
      title = `${prefix} - ${title}`;
    }
    
    // Add user info if logged in and requested
    if (showUser && userInfo) {
      const userDisplay = `${userInfo.display_name || 'User'} [${userInfo.username}]`;
      title = `${title} - ${userDisplay}`;
    }
    
    // Add unread notifications count
    if (showNotifications && unreadCount > 0) {
      title = `(${unreadCount}) ${title}`;
    }
    
    // Add suffix
    if (suffix) {
      title = `${title} - ${suffix}`;
    }
    
    document.title = title;
  }, [baseTitle, prefix, suffix, showNotifications, showUser, unreadCount, userInfo]);

  return {
    unreadCount,
    userInfo,
    setTitle: (newTitle: string) => {
      document.title = newTitle;
    }
  };
}