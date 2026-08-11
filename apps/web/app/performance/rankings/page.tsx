import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PartnerRankingsPage } from "@/components/kpt/partner-rankings";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <RoleGuard allowedRoles={['ADMIN', 'SYSTEM_ADMIN']} redirectTo="/">
          <ErrorBoundary>
            <PartnerRankingsPage />
          </ErrorBoundary>
        </RoleGuard>
      </MainLayout>
    </ProtectedRoute>
  );
}
