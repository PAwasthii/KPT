"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarItem,
  SidebarCollapsibleItem,
  SidebarProvider,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@repo/ui";
import Image from "next/image";
import kptLogo from "../app/assets/images/logos/kpt-logo.png";
import {
  ChartNoAxesCombined,
  Users,
  Settings,
  UserLock,
  TrendingUp,
  BarChart3,
  Package,
  ReceiptText,
  ShoppingCart,
  BookCheckIcon,
  ClipboardCheck,
  Handshake,
  Gift,
  Warehouse,
  AlertTriangle,
  LineChart,
  Trophy,
  BookAIcon,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsAdmin, useIsSystemAdmin } from "./guards/RoleGuard";

function SidebarBrand() {
  const { open } = useSidebar();
  return (
    <Image
      src={kptLogo}
      alt="KPT — Kulkarni Power Tools"
      height={open ? 32 : 28}
      width={open ? 120 : 28}
      className={open ? "h-8 w-auto object-contain object-left" : "h-7 w-7 object-contain object-left"}
      priority
    />
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const isAdmin = useIsAdmin();
  const isSystemAdmin = useIsSystemAdmin();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isChannelPartnersActive = pathname.startsWith("/channel-partners");
  const isStockVisibilityActive = pathname.startsWith("/stock-visibility");
  const isPerformanceActive = pathname.startsWith("/performance");
  const isSalesActive = pathname.startsWith("/sales");

  return (
    <SidebarProvider>
      <Sidebar className="h-full">
        <SidebarHeader>
          <SidebarBrand />
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <SidebarGroup title="">
            <SidebarItem
              icon={ChartNoAxesCombined as any}
              label="Dashboard"
              href="/"
              active={isClient && pathname === "/"}
            />

            {/* Channel Partners & Incentives */}
            <SidebarCollapsibleItem
              icon={Handshake as any}
              label="Channel Partners"
              active={isClient && isChannelPartnersActive}
              defaultOpen={isClient && isChannelPartnersActive}
            >
              <SidebarItem
                label="Partner List"
                href="/channel-partners"
                active={isClient && pathname === "/channel-partners"}
                icon={Users as any}
              />
              <SidebarItem
                label="Incentive Programs"
                href="/channel-partners/incentives"
                active={isClient && pathname === "/channel-partners/incentives"}
                icon={Gift as any}
              />
              <SidebarItem
                label="Incentive Tracker"
                href="/channel-partners/tracker"
                active={isClient && pathname === "/channel-partners/tracker"}
                icon={Trophy as any}
              />
            </SidebarCollapsibleItem>

            {/* Stock Visibility */}
            <SidebarCollapsibleItem
              icon={Warehouse as any}
              label="Stock Visibility"
              active={isClient && isStockVisibilityActive}
              defaultOpen={isClient && isStockVisibilityActive}
            >
              <SidebarItem
                label="Distributor Stock"
                href="/stock-visibility/distributor"
                active={isClient && pathname === "/stock-visibility/distributor"}
                icon={Package as any}
              />
              <SidebarItem
                label="Dealer Stock"
                href="/stock-visibility/dealer"
                active={isClient && pathname === "/stock-visibility/dealer"}
                icon={Package as any}
              />
              <SidebarItem
                label="Low Stock Alerts"
                href="/stock-visibility/alerts"
                active={isClient && pathname === "/stock-visibility/alerts"}
                icon={AlertTriangle as any}
              />
            </SidebarCollapsibleItem>

            {/* Sales & Partner Performance */}
            <SidebarCollapsibleItem
              icon={BarChart3 as any}
              label="Performance Analysis"
              active={isClient && isPerformanceActive}
              defaultOpen={isClient && isPerformanceActive}
            >
              <SidebarItem
                label="Revenue Analysis"
                href="/performance/revenue"
                active={isClient && pathname === "/performance/revenue"}
                icon={LineChart as any}
              />
              <SidebarItem
                label="Partner Rankings"
                href="/performance/rankings"
                active={isClient && pathname === "/performance/rankings"}
                icon={Trophy as any}
              />
              <SidebarItem
                label="Monthly Trends"
                href="/performance/trends"
                active={isClient && pathname === "/performance/trends"}
                icon={TrendingUp as any}
              />
            </SidebarCollapsibleItem>

            {/* Sales Management */}
            <SidebarCollapsibleItem
              icon={TrendingUp as any}
              label="Sales Management"
              active={isClient && isSalesActive}
              defaultOpen={isClient && isSalesActive}
            >
              <SidebarItem
                label="Opportunities"
                href="/sales/opportunities"
                active={isClient && pathname.startsWith("/sales/opportunities")}
                icon={BookAIcon as any}
              />
              <SidebarItem
                label="Quotes"
                href="/sales/quotes"
                active={isClient && pathname.startsWith("/sales/quotes")}
                icon={ReceiptText as any}
              />
              <SidebarItem
                label="Orders"
                href="/sales/orders"
                active={isClient && pathname.startsWith("/sales/orders")}
                icon={ShoppingCart as any}
              />
              <SidebarItem
                label="Product Catalogue"
                href="/sales/products"
                active={isClient && pathname.startsWith("/sales/products")}
                icon={Package as any}
              />
              <SidebarItem
                label="Price Books"
                href="/sales/price-books"
                active={isClient && pathname.startsWith("/sales/price-books")}
                icon={BookCheckIcon as any}
              />
              <SidebarItem
                label="Approvals"
                href="/sales/approvals"
                active={isClient && pathname.startsWith("/sales/approvals")}
                icon={ClipboardCheck as any}
              />
            </SidebarCollapsibleItem>

            {isAdmin && (
              <SidebarItem
                icon={UserLock as any}
                label="User Management"
                href="/admin/user-management"
                active={isClient && pathname === "/admin/user-management"}
              />
            )}
            {isSystemAdmin && (
              <SidebarItem
                icon={Shield as any}
                label="Audit Logs"
                href="/audit-logs"
                active={isClient && pathname.startsWith("/audit-logs")}
              />
            )}
            <SidebarItem
              icon={Settings as any}
              label="Settings"
              href="/settings"
              active={isClient && pathname === "/settings"}
            />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="text-xs font-medium opacity-60">
            © {new Date().getFullYear()} Kulkarni Power Tools
          </p>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
