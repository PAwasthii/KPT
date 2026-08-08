import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DistributorStockPage } from "@/components/kpt/distributor-stock";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <DistributorStockPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
