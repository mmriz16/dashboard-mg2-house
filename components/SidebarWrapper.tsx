"use client";

import { Suspense } from "react";
import { Sidebar as SidebarComponent } from "./Sidebar";

export function Sidebar(props: Parameters<typeof SidebarComponent>[0]) {
  return (
    <Suspense fallback={<div className="w-75 h-screen bg-surface-card border-r border-border" />}>
      <SidebarComponent {...props} />
    </Suspense>
  );
}
