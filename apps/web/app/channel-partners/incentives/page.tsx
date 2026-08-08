import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IncentiveProgramsPage } from "@/components/kpt/incentive-programs";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <IncentiveProgramsPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
