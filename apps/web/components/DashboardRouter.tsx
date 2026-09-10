'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { KptDashboard } from './kpt-dashboard';

/**
 * Renders the correct dashboard based on the authenticated user's role.
 * FINANCE_ADMIN → redirects to /finance/overview (their primary view).
 * All other roles → KptDashboard (no change to existing behaviour).
 */
export function DashboardRouter() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isFinanceAdmin = user?.role === 'FINANCE_ADMIN';

  useEffect(() => {
    if (!isLoading && isFinanceAdmin) {
      router.replace('/finance/overview');
    }
  }, [isLoading, isFinanceAdmin, router]);

  // Show skeleton while auth is resolving or while the redirect is in-flight.
  if (isLoading || isFinanceAdmin) {
    return <div className="p-6 animate-pulse h-96 bg-muted rounded-lg" />;
  }

  return <KptDashboard />;
}
