'use client';

import { useSession } from '@/contexts/SessionContext';

export function useAuthenticatedFetch() {
  const { authenticatedFetch, user, sessionToken, isCreatingSession, logout } = useSession();

  return { 
    authenticatedFetch, 
    user, 
    sessionToken, 
    isCreatingSession,
    logout 
  };
}