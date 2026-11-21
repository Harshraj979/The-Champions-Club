"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Role, ROLES } from "@/lib/rbac";

const linksByRole: Record<Role, { href: string; label: string }[]> = {
  customer: [
    { href: "/courts", label: "Courts" },
    { href: "/#plans", label: "Membership" },
    { href: "/shop", label: "Shop" },
  ],
  employee: [
    { href: "/courts", label: "Courts" },
    { href: "/shop", label: "Shop" },
    { href: "/bar", label: "Bar & Café" },
    { href: "/bookings", label: "Bookings" },
    { href: "/members", label: "Members" },
  ],
  owner: [
    { href: "/courts", label: "Courts" },
    { href: "/shop", label: "Shop" },
    { href: "/bar", label: "Bar & Café" },
    { href: "/bookings", label: "Bookings" },
    { href: "/members", label: "Members" },
    { href: "/dashboard", label: "Dashboard" },
  ],
};

export default function Nav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { store, setRoleWithDemoJwt, logout } = useStore();
  const links = linksByRole[store.role] ?? linksByRole.customer;

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleRoleSelect(role: Role) {
    await setRoleWithDemoJwt(role);
    router.refresh();
  }

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="brand" href="/">The Champions Club</Link>
        <nav className="nav-links" aria-label="Club">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>
        <div className="nav-end">
          <select
            className="role-select"
            aria-label="Active role"
            value={store.role}
            onChange={(e) => handleRoleSelect(e.target.value as Role)}
            title="Switch authenticated JWT role"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          {store.user ? (
            <button
              className="btn btn-quiet"
              style={{ minHeight: "38px", padding: "6px 12px", fontSize: "13px" }}
              onClick={handleLogout}
              title={`Logged in as ${store.user.name} (${store.user.email})`}
            >
              Sign out ({store.user.name.split(" ")[0]})
            </button>
          ) : (
            <Link
              className="btn btn-quiet"
              href="/login"
              style={{ minHeight: "38px", padding: "6px 12px", fontSize: "13px" }}
            >
              Sign in
            </Link>
          )}
          {store.role === "customer" && (
            <Link className="btn btn-ink" href="/trial">Free trial</Link>
          )}
          <button className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <nav className="nav-mobile" aria-label="Club">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          <Link href="/login">Sign in / Switch account</Link>
          {store.role === "customer" && <Link href="/trial">Book a free trial</Link>}
        </nav>
      )}
    </header>
  );
}
