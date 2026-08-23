'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PartnerAuthProvider, usePartnerAuth } from '@/contexts/PartnerAuthContext';
import { KptSidebar } from '@/components/kpt/KptSidebar';

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { partner, isLoading, logout } = usePartnerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !partner) {
      router.replace('/partner/login');
    }
  }, [isLoading, partner, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="flex h-screen bg-[#F7F7F5] overflow-hidden">
      <KptSidebar crn={partner.crn} onLogout={logout} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartnerAuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </PartnerAuthProvider>
  );
}
