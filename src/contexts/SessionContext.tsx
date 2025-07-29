'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirebaseAuth } from './FirebaseAuthContext';

interface SessionContextType {
  sessionToken: string | null;
  isCreatingSession: boolean;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  logout: () => Promise<void>;
  user: any; // Firebase user
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useFirebaseAuth();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize session token from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('sessionToken');
      if (storedToken) {
        setSessionToken(storedToken);
      }
    }
    setHasInitialized(true);
  }, []);

  // Create session when Firebase user changes (only once globally)
  useEffect(() => {
    const createSessionForUser = async () => {
      if (user?.email && user?.uid && !sessionToken && !isCreatingSession && hasInitialized) {
        setIsCreatingSession(true);
        try {
          console.log('🔐 Creating session for Firebase user:', user.email);
          
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firebaseUid: user.uid,
              email: user.email,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Session created successfully');
            setSessionToken(data.sessionToken);
            localStorage.setItem('sessionToken', data.sessionToken);
          } else {
            const error = await response.json();
            console.error('❌ Failed to create session:', error);
          }
        } catch (error) {
          console.error('❌ Session creation error:', error);
        } finally {
          setIsCreatingSession(false);
        }
      }
    };

    if (hasInitialized) {
      createSessionForUser();
    }
  }, [user, sessionToken, isCreatingSession, hasInitialized]);

  // Clear session when user signs out
  useEffect(() => {
    if (!user && sessionToken && typeof window !== 'undefined') {
      console.log('🔐 User signed out, clearing session');
      setSessionToken(null);
      localStorage.removeItem('sessionToken');
    }
  }, [user, sessionToken]);

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    
    // Add session token to Authorization header if available
    const currentSessionToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null);
    if (currentSessionToken) {
      headers.set('Authorization', `Bearer ${currentSessionToken}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get a 401, the session might be expired - clear it
    if (response.status === 401 && typeof window !== 'undefined') {
      console.log('🔐 Session expired, clearing token');
      setSessionToken(null);
      localStorage.removeItem('sessionToken');
    }

    return response;
  };

  const logout = async () => {
    const currentSessionToken = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null);
    if (currentSessionToken) {
      try {
        await fetch('/api/auth/session', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${currentSessionToken}`,
          },
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    
    setSessionToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sessionToken');
    }
  };

  const value = {
    sessionToken,
    isCreatingSession,
    authenticatedFetch,
    logout,
    user
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}