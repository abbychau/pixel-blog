'use client';

import { SessionProvider } from '@/contexts/SessionContext';
import { UserDataProvider } from '@/contexts/UserDataContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <UserDataProvider>
          {children}
        </UserDataProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}