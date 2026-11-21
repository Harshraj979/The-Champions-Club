"use client";
import { useEffect, useState } from "react";
import { Role } from "./rbac";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type StoreBooking = {
  id: number; courtId: number; court: string; who: string;
  date: string; time: number; type: string; price: number; state: string;
};
export type StoreMember = { id: number; name: string; plan: string };

type Store = {
  bookings: StoreBooking[]; members: StoreMember[];
  cancelledSeeds: number[]; shopRevenue: number; barRevenue: number;
  role: Role;
  user: AuthUser | null;
  token: string | null;
};

const KEY = "champions-club-store-v2";
const empty: Store = {
  bookings: [], members: [], cancelledSeeds: [],
  shopRevenue: 0, barRevenue: 0,
  role: "customer", user: null, token: null,
};

function load(): Store {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return empty; }
}

let cache: Store | null = null;
const listeners = new Set<() => void>();
function save(next: Store) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn());
}

export function useStore() {
  const [store, setStore] = useState<Store>(empty);

  useEffect(() => {
    if (!cache) cache = load();
    setStore(cache);
    const fn = () => setStore(cache!);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const update = (patch: Partial<Store>) => save({ ...(cache ?? load()), ...patch });

  return {
    store,
    setAuth: (token: string | null, user: AuthUser | null) =>
      update({ token, user, role: user ? user.role : "customer" }),
    logout: async () => {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
      update({ token: null, user: null, role: "customer" });
    },
    setRoleWithDemoJwt: async (role: Role) => {
      const demoEmail = `${role}@club.com`;
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: demoEmail, password: "password123" }),
        });
        if (res.ok) {
          const data = await res.json();
          update({ token: data.token, user: data.user, role: data.user.role });
          return;
        }
      } catch {}
      update({ role });
    },
    addBooking: (b: Omit<StoreBooking, "id" | "state">) =>
      update({ bookings: [...(cache ?? load()).bookings, { ...b, id: Date.now(), state: "booked" }] }),
    cancelBooking: (id: number, isSeed: boolean) => {
      const s = cache ?? load();
      if (isSeed) update({ cancelledSeeds: [...s.cancelledSeeds, id] });
      else update({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, state: "cancelled" } : b)) });
    },
    addMember: (m: Omit<StoreMember, "id">) =>
      update({ members: [{ ...m, id: Date.now() }, ...(cache ?? load()).members] }),
    addRevenue: (kind: "shop" | "bar", amount: number) => {
      const s = cache ?? load();
      if (kind === "shop") update({ shopRevenue: s.shopRevenue + amount });
      else update({ barRevenue: s.barRevenue + amount });
    },
  };
}
