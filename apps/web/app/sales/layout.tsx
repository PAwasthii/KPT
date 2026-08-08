import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Synkro CRM",
  description: "Synkro CRM",
};

export default function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
