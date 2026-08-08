import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChannelPartnersPage } from "@/components/kpt/channel-partners";

export default function Page() {
  return (
    <ProtectedRoute fallback={<MainLayout><div className="p-6 animate-pulse h-96 bg-muted rounded-lg" /></MainLayout>}>
      <MainLayout>
        <ChannelPartnersPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
