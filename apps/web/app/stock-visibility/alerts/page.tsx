import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StockAlertsPage } from "@/components/kpt/stock-alerts";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <RoleGuard allowedRoles={['ADMIN', 'SYSTEM_ADMIN']} redirectTo="/">
          <ErrorBoundary>
            <StockAlertsPage />
          </ErrorBoundary>
        </RoleGuard>
      </MainLayout>
    </ProtectedRoute>
  );
}
