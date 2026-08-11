import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MonthlyTrendsPage } from "@/components/kpt/monthly-trends";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <RoleGuard allowedRoles={['ADMIN', 'SYSTEM_ADMIN']} redirectTo="/">
          <ErrorBoundary>
            <MonthlyTrendsPage />
          </ErrorBoundary>
        </RoleGuard>
      </MainLayout>
    </ProtectedRoute>
  );
}
