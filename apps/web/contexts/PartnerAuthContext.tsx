'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface FieldVisit {
  scheduledDate: string | null;
  execName: string | null;
  note: string | null;
}

interface PartnerSession {
  crn: string;
  firmName: string;
  ownerName: string;
  mobile: string;
  email: string;
  currentStage: number;
  status: string;
  city: string;
  state: string;
  productInterest: string[];
  createdAt: string;
  fieldVisit: FieldVisit | null;
}

interface PartnerAuthContextType {
  partner: PartnerSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const PartnerAuthContext = createContext<PartnerAuthContextType | undefined>(undefined);

export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [partner, setPartner] = useState<PartnerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as PartnerSession;
        setPartner(data);
      } else {
        setPartner(null);
      }
    } catch {
      setPartner(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const refresh = useCallback(async () => { await fetchSession(); }, [fetchSession]);

  const logout = useCallback(async () => {
    await fetch('/api/partner/auth/logout', { method: 'POST', credentials: 'include' });
    setPartner(null);
    router.push('/partner/login');
  }, [router]);

  return (
    <PartnerAuthContext.Provider value={{ partner, isLoading, isAuthenticated: !!partner, refresh, logout }}>
      {children}
    </PartnerAuthContext.Provider>
  );
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) throw new Error('usePartnerAuth must be used within PartnerAuthProvider');
  return ctx;
}
