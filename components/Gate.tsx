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
            This area requires <strong>{required}</strong> permissions. Your current role is <strong>{store.role}</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link className="btn btn-ink" href={`/login?from=${typeof window !== "undefined" ? window.location.pathname : "/"}`}>
            Sign in with {required} account
          </Link>
          <Link className="text-link" href="/">Return home</Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
