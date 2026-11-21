import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-poppins" });
export const metadata = { title: "The Champions Club", description: "Tennis mornings. Cricket evenings. One club." };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <nav className="nav">
          <div className="links">
            <Link href="/courts">Courts</Link><Link href="/#plans">Membership</Link>
            <Link href="/shop">Shop</Link><Link href="/bar">Bar &amp; Café</Link>
          </div>
          <Link className="brand" href="/">The Champions Club</Link>
          <div className="right">
            <Link href="/dashboard" className="staff">Staff</Link>
            <Link href="/trial"><button className="pill black">Book Now</button></Link>
          </div>
        </nav>
        {children}
        <footer><div className="wrap">
          <span>The Champions Club — courts open 6 AM to 10 PM, every day.</span>
          <span>Front desk: +91 98765 43210</span>
        </div></footer>
      </body>
    </html>
  );
}
