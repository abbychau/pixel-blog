'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  display_color?: string;
}

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { authenticatedFetch, user: firebaseUser, sessionToken, isCreatingSession } = useSession();

  useEffect(() => {
    // Only check auth when we have a Firebase user and session is ready
    if (firebaseUser && sessionToken && !isCreatingSession) {
      checkAuth();
    } else if (!firebaseUser) {
      // No Firebase user, definitely not admin
      setIsAdmin(false);
      setAdminUser(null);
      setLoading(false);
    }
    // If firebaseUser exists but session isn't ready, keep loading
  }, [firebaseUser, sessionToken, isCreatingSession]);

  const checkAuth = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/auth/me');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(true);
        setAdminUser(data.user);
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
    } catch (error) {
      setIsAdmin(false);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, adminUser, loading };
}