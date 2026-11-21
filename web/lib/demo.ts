// Demo data mirrors the Odoo seed data exactly. Pages try the live API
// first and fall back to this, so the site always demos.
export const plans = [
  { code: "gold", name: "Gold", court: 0, shop: 15, bar: 15, days: 365 },
  { code: "silver", name: "Silver", court: 300, shop: 10, bar: 10, days: 365 },
  { code: "junior", name: "Junior", court: 200, shop: 5, bar: 0, days: 365 },
];
export const courts = [
  { id: 1, name: "Tennis 1", sport: "tennis", walkin_price: 500 },
  { id: 2, name: "Tennis 2", sport: "tennis", walkin_price: 500 },
  { id: 3, name: "Cricket 1", sport: "cricket", walkin_price: 800 },
];
export const products = [
  { id: 1, name: "Tennis Racket", list_price: 4999, qty_available: 12, categ_id: [1, "Gear"] },
  { id: 2, name: "Tennis Balls (can of 3)", list_price: 549, qty_available: 60, categ_id: [1, "Gear"] },
  { id: 3, name: "Cricket Bat", list_price: 3499, qty_available: 8, categ_id: [1, "Gear"] },
  { id: 4, name: "Sports Shoes", list_price: 2999, qty_available: 15, categ_id: [1, "Gear"] },
  { id: 5, name: "Club T-shirt", list_price: 999, qty_available: 40, categ_id: [1, "Gear"] },
  { id: 6, name: "Cold Coffee", list_price: 250, qty_available: 99, categ_id: [2, "Bar and Cafe"] },
  { id: 7, name: "Draught Beer", list_price: 280, qty_available: 99, categ_id: [2, "Bar and Cafe"] },
  { id: 8, name: "Veg Sandwich", list_price: 180, qty_available: 99, categ_id: [2, "Bar and Cafe"] },
  { id: 9, name: "Fries", list_price: 150, qty_available: 99, categ_id: [2, "Bar and Cafe"] },
];
export const members = [
  { id: 1, name: "Aarav Sharma", club_plan_id: [1, "Gold"], membership_state: "active" },
  { id: 2, name: "K. Singh", club_plan_id: [2, "Silver"], membership_state: "active" },
  { id: 3, name: "Rohan Verma", club_plan_id: [3, "Junior"], membership_state: "expired" },
  { id: 4, name: "Meera Iyer", club_plan_id: [1, "Gold"], membership_state: "expiring" },
];
export const todayBookings = [
  { id: 1, court: "Tennis 1", who: "Aarav Sharma", time: 10, type: "regular", price: 0, state: "booked" },
  { id: 2, court: "Tennis 1", who: "K. Singh", time: 18, type: "regular", price: 300, state: "booked" },
  { id: 3, court: "Cricket 1", who: "Walk-in: Imran", time: 17, type: "regular", price: 800, state: "booked" },
  { id: 4, court: "Tennis 2", who: "Friday Social Play (8 members)", time: 19, type: "friday_social", price: 0, state: "booked" },
];
// slots already taken in demo mode, by court id
export const demoTaken: Record<number, number[]> = { 1: [10, 18], 2: [19], 3: [17] };
export const fmtTime = (t: number) => {
  const h = Math.floor(t), m = t % 1 ? "30" : "00";
  const ap = h >= 12 ? "PM" : "AM", h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m} ${ap}`;
};
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
