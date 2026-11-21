"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { Role, canAccess } from "@/lib/rbac";
import { useStore } from "@/lib/store";

export default function Gate({ required, children }: { required: Role; children: ReactNode }) {
  const { store } = useStore();

  if (!canAccess(store.role, required)) {
    return (
      <main className="wrap page">
        <div className="page-head">
          <h1 className="page-title">Access restricted</h1>
          <p className="sub">
            This area requires <strong>{required}</strong> permissions. Your active role is <strong>{store.role}</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link className="btn btn-ink" href="/">Return home</Link>
          <span className="muted">Switch your role in the navigation bar to test access.</span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
