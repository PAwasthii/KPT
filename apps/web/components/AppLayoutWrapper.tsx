'use client';

import { usePathname, useRouter } from "next/navigation";
import { HeaderWrapper } from "./header-wrapper";
import { AppSidebar } from "./appSidebar";
import { useLeadManagementContext } from "../contexts/LeadManagementContext";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";

interface AppLayoutWrapperProps {
  children: React.ReactNode;
}

export function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDeveloper, isAuthenticated } = useAuth();

  // Try to get lead management context, but don't fail if not available
  let leadContext = null;
  try {
    leadContext = useLeadManagementContext();
  } catch {
    // Context not available, which is fine for non-lead pages
  }

  // Pages that should not show sidebar and header
  const authPages = ['/login', '/signup', '/forgot-password', '/subdealer', '/developer-login', '/integration-manager', '/reset-password', '/aakraman', '/aakraman/book-a-order', '/aakraman/customer-details'];
  const publicPrefixes = ['/partner/', '/kpt-admin'];
  const isAuthPage = authPages.includes(pathname) || publicPrefixes.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (!isAuthenticated || !isDeveloper) {
      return;
    }

    if (pathname !== '/integration-manager') {
      router.replace('/integration-manager');
    }
  }, [isAuthenticated, isDeveloper, pathname, router]);

  // Show lead tabs only on leads page and when context is available
  const showLeadTabs = pathname === '/leads' && leadContext !== null;
  const activeTab = leadContext?.activeTab || 'lead-master';

  if (isAuthPage) {
    return (
      <div className="h-screen w-full overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <div className="h-full flex max-w-screen-3xl mx-auto">
      {/* Full-height brand sidebar (contains the logo) */}
      <div className="shrink-0 h-full">
        <AppSidebar />
      </div>

      {/* Content column: white top bar over the scrollable main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderWrapper className="bg-white" />
        <main className="flex-1 overflow-y-auto">
          <div key={pathname} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
