import * as React from "react";
import { cn } from "@repo/ui/lib/utils";
import { useSidebar } from "./sidebar-provider";

// Deep-indigo dominant -> brand-teal vertical gradient, applied inline so it does NOT
// depend on globals.css being rebuilt/cached. This guarantees the gradient shows
// whenever this component file is in place.
// Ratio: ~75% solid dark indigo, transitioning to teal over the final ~25%.
const SIDEBAR_GRADIENT =
  "linear-gradient(180deg, #0F1B3D 0%, #0F1B3D 75%, #0B4A52 90%, #009D9A 100%)";

export function Sidebar({
  className,
  children,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return (
    <aside
      className={cn(
        "flex flex-col border-r-[1px] border-sidebar-border text-sidebar-foreground transition-[width] duration-200 ease-in-out shadow-sm",
        open ? "w-64" : "w-16",
        className
      )}
      style={{
        backgroundColor: "#0F1B3D",
        backgroundImage: SIDEBAR_GRADIENT,
        ...style,
      }}
      {...props}
    >
      {children}
    </aside>
  );
}
