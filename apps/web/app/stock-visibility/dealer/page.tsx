import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DealerStockPage } from "@/components/kpt/dealer-stock";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <DealerStockPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
