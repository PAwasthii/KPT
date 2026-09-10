import { MainLayout } from "@/components/main-layout";
import { DashboardRouter } from "@/components/DashboardRouter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <DashboardRouter />
      </MainLayout>
    </ProtectedRoute>
  );
}

