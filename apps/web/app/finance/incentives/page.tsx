import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IncentivesPage } from "@/components/finance/IncentivesPage";

export const metadata = { title: "Incentive Liability — KPT CRM" };

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <RoleGuard allowedRoles={['ADMIN', 'SYSTEM_ADMIN', 'FINANCE_ADMIN']} redirectTo="/">
          <ErrorBoundary>
            <IncentivesPage />
          </ErrorBoundary>
        </RoleGuard>
      </MainLayout>
    </ProtectedRoute>
  );
}
