"use client";

import { RoleGuard } from "@/components/guards/RoleGuard";
import { ProductManagement } from "@/components/product-management";

export default function ProductsPage() {
  return (
    <RoleGuard allowedRoles={['SYSTEM_ADMIN','ADMIN', 'SALES']}>
      <ProductManagement />
    </RoleGuard>
  );
}

