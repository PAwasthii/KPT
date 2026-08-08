'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SalesRouteGuard Component
 * Ensures sales users can ONLY access /sales routes
 * Redirects them if they try to access other routes
 */
export function SalesRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If user is not authenticated, let the auth system handle it
    if (!user) return;

    // If user is SALES role
    if (user.role === 'SALES') {
      // Check if they're trying to access a non-sales route
      const allowedRoutes = ['/sales'];
      const isAllowedRoute = allowedRoutes.some(route => pathname.startsWith(route));

      // Block all routes except /sales (including home "/")
      if (!isAllowedRoute && pathname !== '/login' && pathname !== '/unauthorized') {
        console.log('Sales user tried to access unauthorized route:', pathname);
        router.push('/sales');
      }
    }
  }, [user, isLoading, pathname, router]);

  return <>{children}</>;
}
