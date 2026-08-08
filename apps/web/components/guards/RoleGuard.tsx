'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleGuard Component
 * Restricts access to routes based on user roles
 * Redirects unauthorized users to specified route or /unauthorized
 */
export function RoleGuard({ children, allowedRoles, redirectTo = '/unauthorized' }: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user has required role
    if (user && !allowedRoles.includes(String(user.role))) {
      router.push(redirectTo);
    }
  }, [user, isLoading, isAuthenticated, allowedRoles, redirectTo, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or unauthorized
  if (!isAuthenticated || (user && !allowedRoles.includes(String(user.role)))) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(role: string | string[]): boolean {
  const { user } = useAuth();

  if (!user) return false;

  if (Array.isArray(role)) {
    return role.includes(String(user.role));
  }

  return String(user.role) === role;
}

/**
 * Hook to check if user is System Admin
 */
export function useIsSystemAdmin(): boolean {
  return useHasRole('SYSTEM_ADMIN');
}

/**
 * Hook to check if user is Admin (SYSTEM_ADMIN or ADMIN)
 */
export function useIsAdmin(): boolean {
  return useHasRole(['SYSTEM_ADMIN', 'ADMIN']);
}

/**
 * Hook to check if user is specifically ADMIN (not SYSTEM_ADMIN)
 */
export function useIsAdminRole(): boolean {
  return useHasRole('ADMIN');
}

/**
 * Hook to check if user is Sales
 */
export function useIsSales(): boolean {
  return useHasRole('SALES');
}
