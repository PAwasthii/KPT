import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuditLogsView } from "@/components/audit-logs/AuditLogsView";

export default function AuditLogsPage() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <AuditLogsView />
      </MainLayout>
    </ProtectedRoute>
  );
}
