import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "KPT CRM",
  description: "KPT CRM",
};

export default function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
