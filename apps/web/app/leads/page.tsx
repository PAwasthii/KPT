"use client"

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function LeadsRedirectInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    const validTabs = ['lead-master', 'assigned', 'unassigned-leads', 'accounts', 'contacts'];
    if (tab && validTabs.includes(tab)) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('tab');
      const queryString = newSearchParams.toString();
      const redirectUrl = `/leads/${tab}${queryString ? `?${queryString}` : ''}`;
      window.location.replace(redirectUrl);
      return;
    }
    window.location.replace('/leads/lead-master');
  }, [tab, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LeadsRedirectInner />
    </Suspense>
  );
}
