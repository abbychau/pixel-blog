'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { ReactNode } from 'react';

interface AuthenticatedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function AuthenticatedLink({ href, children, className }: AuthenticatedLinkProps) {
  const { user } = useFirebaseAuth();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    // For admin routes, check if we need to set Firebase auth headers
    if (href.startsWith('/admin') && user?.email) {
      e.preventDefault();
      
      // Use router.push which will include the Firebase email in subsequent API calls
      router.push(href);
    }
    // For non-admin routes or non-Firebase users, use normal Link behavior
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}