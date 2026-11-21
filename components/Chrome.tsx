"use client";

// The landing page carries its own header and footer (the Figma Make
// design); every other page gets the club nav and footer.
import { usePathname } from "next/navigation";
import Link from "next/link";
import Nav from "./Nav";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/") return <>{children}</>;
  return (
    <>
      <Nav />
      {children}
      <footer className="footer">
        <div className="wrap footer-in">
          <div>
            <p className="footer-brand">The Champions Club</p>
            <p className="muted">Courts open 6 AM to 10 PM, every day.<br />Front desk: +91 98765 43210</p>
          </div>
          <nav>
            <Link href="/courts">Courts</Link>
            <Link href="/trial">Free trial</Link>
            <Link href="/#membership">Membership</Link>
          </nav>
          <nav>
            <Link href="/shop">Shop</Link>
            <Link href="/bar">Bar &amp; Café</Link>
          </nav>
          <nav>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/bookings">Bookings</Link>
            <Link href="/members">Members</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
