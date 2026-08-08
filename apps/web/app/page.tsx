import { MainLayout } from "@/components/main-layout";
import { KptDashboard } from "@/components/kpt-dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <KptDashboard />
      </MainLayout>
    </ProtectedRoute>
  );
}

