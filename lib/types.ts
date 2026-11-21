// The API contract. The web app uses these types today; a future mobile
// app consumes the same JSON. Dates are YYYY-MM-DD, times are minutes
// from midnight, money is whole rupees.
export type PlanDTO = {
  code: string;
  name: string;
  courtPrice: number;
  shopDiscount: number;
  barDiscount: number;
  termDays: number;
};

export type CourtDTO = { id: number; name: string; sport: string; walkinPrice: number };

export type ProductDTO = {
  id: number;
  name: string;
  price: number;
  stock: number | null;
  lowAt: number;
  category: "GEAR" | "BAR";
};

export type MemberState = "active" | "expiring" | "expired";

export type MemberDTO = {
  id: number;
  name: string;
  phone: string;
  plan: string;
  planCode: string;
  state: MemberState;
  expiresOn: string;
};

export type BookingDTO = {
  id: number;
  courtId: number;
  court: string;
  who: string;
  phone: string;
  date: string;
  start: number;
  type: "REGULAR" | "FRIDAY_SOCIAL" | "TRIAL";
  price: number;
  state: "BOOKED" | "CANCELLED";
};

export type DashboardDTO = {
  date: string;
  totals: { courts: number; shop: number; bar: number; total: number };
  byMethod: { method: "CASH" | "CARD" | "UPI"; amount: number }[];
  onCourt: BookingDTO[];
  lowStock: ProductDTO[];
};

export type StaffDTO = { id: number; name: string; email: string; role: "OWNER" | "STAFF" };
