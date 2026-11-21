"use client";
import { useEffect, useState } from "react";

// One shared demo store for the whole prototype. When Odoo is offline the
// site still behaves like one system: a booking made on Courts shows up in
// Bookings and moves the Dashboard, a settled bar tab moves the Bar total.
// Everything persists in the browser (localStorage), nothing is faked twice.
export type StoreBooking = {
  id: number; courtId: number; court: string; who: string;
  date: string; time: number; type: string; price: number; state: string;
};
export type StoreMember = { id: number; name: string; plan: string };
type Store = {
  bookings: StoreBooking[]; members: StoreMember[];
  cancelledSeeds: number[]; shopRevenue: number; barRevenue: number;
};
const KEY = "champions-club-store-v1";
const empty: Store = { bookings: [], members: [], cancelledSeeds: [], shopRevenue: 0, barRevenue: 0 };

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
