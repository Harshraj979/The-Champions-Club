import type { ReactNode } from "react";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

const dm = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], style: ["normal", "italic"], variable: "--font-display" });
export const metadata = { title: "The Champions Club", description: "Two tennis courts, a cricket pitch, a gear shop and a bar. One club, open 6 AM to 10 PM." };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dm.variable} ${barlow.variable}`}>
      <body>
        <Nav />
        {children}
        <footer className="footer">
          <div className="wrap footer-in">
            <div>
              <p className="footer-brand">The Champions Club</p>
              <p className="muted">Courts open 6 AM to 10 PM, every day.<br />Front desk: +91 98765 43210</p>
            </div>
            <nav aria-label="Visit">
              <Link href="/courts">Courts</Link>
              <Link href="/trial">Free trial</Link>
              <Link href="/#plans">Membership</Link>
            </nav>
            <nav aria-label="Club">
              <Link href="/shop">Shop</Link>
              <Link href="/bar">Bar &amp; Café</Link>
            </nav>
            <nav aria-label="Staff">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/bookings">Bookings</Link>
              <Link href="/members">Members</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
