// Everything the club runs on, in one file: plans, courts, products,
// members, today's bookings. When the backend lands, it sends this shape.
export const plans = [
  { code: "gold", name: "Gold", court: 0, shop: 15, bar: 15, days: 365 },
  { code: "silver", name: "Silver", court: 300, shop: 10, bar: 10, days: 365 },
  { code: "junior", name: "Junior", court: 200, shop: 5, bar: 0, days: 365 },
] as const;
export type PlanCode = (typeof plans)[number]["code"];

export const courts = [
  { id: 1, name: "Tennis 1", sport: "Tennis", walkin: 500 },
  { id: 2, name: "Tennis 2", sport: "Tennis", walkin: 500 },
  { id: 3, name: "Cricket 1", sport: "Cricket", walkin: 800 },
] as const;

export type Product = { id: number; name: string; price: number; stock?: number; category: "gear" | "bar" };
export const products: Product[] = [
  { id: 1, name: "Tennis racket", price: 4999, stock: 12, category: "gear" },
  { id: 2, name: "Tennis balls, can of 3", price: 549, stock: 60, category: "gear" },
  { id: 3, name: "Cricket bat", price: 3499, stock: 8, category: "gear" },
  { id: 4, name: "Sports shoes", price: 2999, stock: 15, category: "gear" },
  { id: 5, name: "Club t-shirt", price: 999, stock: 40, category: "gear" },
  { id: 6, name: "Cold coffee", price: 250, category: "bar" },
  { id: 7, name: "Draught beer", price: 280, category: "bar" },
  { id: 8, name: "Veg sandwich", price: 180, category: "bar" },
  { id: 9, name: "Fries", price: 150, category: "bar" },
];

export type MemberState = "active" | "expiring" | "expired";
export const members: { id: number; name: string; plan: string; state: MemberState }[] = [
  { id: 1, name: "Aarav Sharma", plan: "Gold", state: "active" },
  { id: 2, name: "K. Singh", plan: "Silver", state: "active" },
  { id: 3, name: "Rohan Verma", plan: "Junior", state: "expired" },
  { id: 4, name: "Meera Iyer", plan: "Gold", state: "expiring" },
];

export type SeedBooking = { id: number; courtId: number; court: string; who: string; time: number; type: "regular" | "friday_social" | "trial"; price: number };
export const todayBookings: SeedBooking[] = [
  { id: 1, courtId: 1, court: "Tennis 1", who: "Aarav Sharma", time: 10, type: "regular", price: 0 },
  { id: 2, courtId: 1, court: "Tennis 1", who: "K. Singh", time: 18, type: "regular", price: 300 },
  { id: 3, courtId: 3, court: "Cricket 1", who: "Walk-in: Imran", time: 17, type: "regular", price: 800 },
  { id: 4, courtId: 2, court: "Tennis 2", who: "Friday Social Play (8 members)", time: 19, type: "friday_social", price: 0 },
];
// already booked today, by court
export const takenSlots: Record<number, number[]> = { 1: [10, 18], 2: [19], 3: [17] };
// what the tills already had before this session started
export const dayTotals = { courts: 13400, shop: 10399, bar: 6680 };

export const hours = [
  { what: "Courts", when: "6 AM to 10 PM" },
  { what: "Shop", when: "8 AM to 9 PM" },
  { what: "Bar & Café", when: "11 AM to 11 PM" },
  { what: "Friday Social Play", when: "Fridays, 7 PM" },
];

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fmtTime = (t: number) => {
  const h = Math.floor(t), m = t % 1 ? "30" : "00";
  const ap = h >= 12 ? "PM" : "AM", h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m} ${ap}`;
};
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
