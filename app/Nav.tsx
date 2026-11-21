"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/courts", label: "Courts" },
  { href: "/#plans", label: "Membership" },
  { href: "/shop", label: "Shop" },
  { href: "/bar", label: "Bar & Café" },
  { href: "/dashboard", label: "Staff" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
          <Link className="btn btn-ink" href="/trial">Book a free trial</Link>
          <button className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <nav className="nav-mobile" aria-label="Club">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          <Link href="/trial">Book a free trial</Link>
        </nav>
      )}
    </header>
  );
}
