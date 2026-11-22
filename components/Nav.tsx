"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import ClubLogo from "@/components/ClubLogo";
import type { MemberSessionDTO, StaffDTO } from "@/lib/types";

const publicLinks = [
  { href: "/courts", label: "Courts" },
  { href: "/#membership", label: "Membership" },
  { href: "/shop", label: "Shop" },
  { href: "/bar", label: "Bar & Café" },
];
const staffLinksFor = (role: StaffDTO["role"]) => {
  const desk = [
    { href: "/bookings", label: "Bookings" },
    { href: "/members", label: "Members" },
    { href: "/enquiries", label: "Enquiries" },
  ];
  if (role === "OWNER") return [{ href: "/dashboard", label: "Dashboard" }, ...desk, { href: "/bar", label: "Bar" }, { href: "/shop", label: "Shop" }];
  if (role === "FRONT_DESK" || role === "STAFF") return desk;
  if (role === "BAR") return [{ href: "/bar", label: "Bar & Cafeteria" }];
  return [{ href: "/shop", label: "Pro Shop" }];
};
const roleLabel: Record<StaffDTO["role"], string> = {
  OWNER: "Owner",
  FRONT_DESK: "Club staff",
  STAFF: "Club staff",
  BAR: "Bar staff",
  SHOP: "Shop staff",
};

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffDTO | null>(null);
  const [member, setMember] = useState<MemberSessionDTO | null>(null);
  const path = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    api.me()
      .then((r) => setStaff(r.staff))
      .catch(() => setStaff(null));
    api.memberMe()
      .then((r) => setMember(r.member))
      .catch(() => setMember(null));
  }, [path]);

  async function signStaffOut() {
    await api.logout().catch(() => {});
    setStaff(null);
    window.location.href = "/";
  }

  async function signMemberOut() {
    await api.memberLogout().catch(() => {});
    setMember(null);
    window.location.href = "/";
  }

  const links = staff
    ? staffLinksFor(staff.role)
    : member
    ? [
        { href: "/courts", label: "Courts" },
        { href: "/member", label: "My Club" },
        { href: "/shop", label: "Shop" },
        { href: "/bar", label: "Bar & Café" },
      ]
    : publicLinks;
  const isCurrent = (href: string) =>
    href.startsWith("/#")
      ? path === "/"
      : path === href || (href !== "/" && path.startsWith(`${href}/`));

  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="brand" href="/" aria-label="The Champions Club, home">
          <ClubLogo size={38} />
          <span className="brand-words"><b>Champions</b><small>The club</small></span>
        </Link>
        <nav className="nav-links" aria-label="Club">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>
        <div className="nav-end">
          {staff ? (
            <>
              <span className="staff-chip">{staff.name}<span className="chip-role">{roleLabel[staff.role]}</span></span>
              <button className="btn btn-quiet" onClick={signStaffOut}>Sign out</button>
            </>
          ) : member ? (
            <>
              <Link href="/member" className="member-chip" title="View my club portal & bookings">
                <span>⚡ {member.name}</span>
                <span className="chip-tier">{member.plan ? member.plan.name : "No Plan"}</span>
              </Link>
              <button className="btn btn-quiet" onClick={signMemberOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-paper" href="/member-login">Member sign-in</Link>
              <Link className="btn btn-quiet text-xs opacity-60" href="/login" title="Staff portal sign in">Staff</Link>
            </>
          )}
          {member ? (
            <Link className="btn btn-ink" href="/courts">Book a court</Link>
          ) : (
            <Link className="btn btn-ink" href="/member-login?tab=signup">Join the club</Link>
          )}
          <button
            className="menu-btn"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="club-mobile-navigation"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="nav-mobile" id="club-mobile-navigation" aria-label="Club">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>{l.label}</Link>
          ))}
          {member ? (
            <Link href="/courts">Book a court</Link>
          ) : (
            <Link href="/member-login?tab=signup">Join the club</Link>
          )}
          {staff ? (
            <>
              <span className="mobile-chip">{staff.name} · {roleLabel[staff.role]}</span>
              <button className="mobile-signout" onClick={signStaffOut}>Sign out</button>
            </>
          ) : member ? (
            <button className="mobile-signout" onClick={signMemberOut}>Sign out ({member.name})</button>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/member-login">Member sign-in</Link>
              <Link href="/login" className="text-xs opacity-60">Staff sign-in</Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
