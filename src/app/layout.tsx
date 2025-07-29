import './globals.css'
import '@/lib/startup' // Initialize database on startup
import type { Metadata } from 'next'
import { FirebaseAuthProvider } from '@/contexts/FirebaseAuthContext'
import { ClientProviders } from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: 'M2NP/TERMINAL - Blog',
  description: 'A pixel-style blog with terminal aesthetic',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-mono">
        <FirebaseAuthProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </FirebaseAuthProvider>
      </body>
    </html>
  )
}