'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useFirebaseAuth } from './FirebaseAuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface UnifiedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  source: 'firebase' | 'admin';
  displayName?: string;
}

interface UnifiedAuthContextType {
  user: UnifiedUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
});

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export const UnifiedAuthProvider = ({ children }: UnifiedAuthProviderProps) => {
  const { user: firebaseUser, loading: firebaseLoading } = useFirebaseAuth();
  const { isAdmin, adminUser, loading: adminLoading } = useAdminAuth();
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check admin auth first (takes precedence)
    if (!adminLoading) {
      if (isAdmin && adminUser) {
        setUser({
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
          source: 'admin',
        });
        setLoading(false);
        return;
      }
    }

    // Then check Firebase auth
    if (!firebaseLoading) {
      if (firebaseUser) {
        // Try to get the synced user data from local database
        fetchFirebaseUserData(firebaseUser.email!);
      } else {
        setUser(null);
        setLoading(false);
      }
    }
  }, [firebaseUser, firebaseLoading, isAdmin, adminUser, adminLoading]);

  const fetchFirebaseUserData = async (email: string) => {
    try {
      const response = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: firebaseUser?.uid,
          email: firebaseUser?.email,
          displayName: firebaseUser?.displayName,
          photoURL: firebaseUser?.photoURL,
          provider: 'firebase'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          source: 'firebase',
          displayName: firebaseUser?.displayName || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching Firebase user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};