import type { BookingDTO, CourtDTO, DashboardDTO, EnquiryDTO, ExpenseDTO, ExpiringDTO, InvoiceDTO, MemberDTO, MemberHomeDTO, MemberSessionDTO, OrderDTO, PayrollDTO, PlanDTO, ProductDTO, RolePinDTO, ShiftDTO, StaffDTO, StaffMemberPinDTO, StaffRosterDTO, TabDTO } from "./types";

// The web app's one door to the API. Every page fetches through here, so
// error handling and the base path live in exactly one place. A mobile
// app would call the same endpoints with its own client.
export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(0, "Cannot reach the club server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiClientError(res.status, data?.error ?? "Something went wrong");
  return data as T;
}

const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  plans: () => call<PlanDTO[]>("/plans"),
  courts: () => call<CourtDTO[]>("/courts"),
  products: (category?: "GEAR" | "BAR") =>
    call<ProductDTO[]>(`/products${category ? `?category=${category}` : ""}`),
  availability: (courtId: number, date: string) =>
    call<{ taken: number[] }>(`/availability?courtId=${courtId}&date=${date}`),
  schedule: (date: string) => call<BookingDTO[]>(`/schedule?date=${date}`),
  lookupMember: (name: string) =>
    call<{
      member: {
        name: string;
        plan: string;
        planCode: string;
        state: "active" | "expiring" | "expired";
        tennisPrice: number;
        cricketPrice: number;
        shopDiscount: number;
        barDiscount: number;
      } | null;
    }>(`/members/lookup?name=${encodeURIComponent(name)}`),
  createBooking: (input: {
    courtId: number;
    date: string;
    start: number;
    name: string;
    phone?: string;
    email?: string;
    type?: "REGULAR" | "TRIAL" | "FRIDAY_SOCIAL";
  }) => post<BookingDTO>("/bookings", input),
  bookings: (date?: string) => call<BookingDTO[]>(`/bookings${date ? `?date=${date}` : ""}`),
  cancelBooking: (id: number) => post<BookingDTO>(`/bookings/${id}/cancel`),
  members: (q?: string) => call<MemberDTO[]>(`/members${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  expiringMembers: () => call<ExpiringDTO[]>("/members/expiring"),
  createMember: (input: {
    name: string;
    phone?: string;
    email?: string;
    planCode: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    dateOfBirth?: string;
  }) => post<MemberDTO>("/members", input),
  availMembership: (input: {
    email: string;
    name?: string;
    phone?: string;
    planCode: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    dateOfBirth?: string;
  }) => post<MemberDTO>("/members/avail-plan", input),
  createOrder: (input: {
    items: { productId: number; qty: number }[];
    name: string;
    phone: string;
    payMethod: "CASH" | "CARD" | "UPI";
    fulfilment?: "PICKUP" | "DELIVERY";
    address?: string;
    payOnline?: boolean;
  }) => post<OrderDTO & { razorpayOrderId?: string }>("/orders", input),
  orders: () => call<OrderDTO[]>("/orders"),
  invoices: () => call<InvoiceDTO[]>("/invoices"),
  createInvoice: (input: { billedTo: string; detail?: string; amount: number }) => post<InvoiceDTO>("/invoices", input),
  payInvoice: (id: number) => post<InvoiceDTO>(`/invoices/${id}/pay`, {}),
  expenses: () => call<ExpenseDTO[]>("/expenses"),
  createExpense: (input: { title: string; category?: string; amount: number; spentOn: string; note?: string }) => post<ExpenseDTO>("/expenses", input),
  payroll: () => call<PayrollDTO[]>("/payroll"),
  createPayroll: (input: { staffName: string; month: string; salary: number; leaveDays?: number; tax?: number }) => post<PayrollDTO>("/payroll", input),
  payPayroll: (id: number) => post<PayrollDTO>(`/payroll/${id}/pay`, {}),
  staffRoster: () => call<StaffRosterDTO[]>("/staff"),
  shifts: (from: string, to: string) => call<ShiftDTO[]>(`/shifts?from=${from}&to=${to}`),
  assignShift: (input: { staffId: number; date: string; part: "MORNING" | "EVENING" }) => post<ShiftDTO>("/shifts", input),
  removeShift: (id: number) => call<{ ok: true }>(`/shifts/${id}`, { method: "DELETE" }),
  payConfig: () => call<{ enabled: boolean; keyId: string | null }>("/payments/config"),
  confirmPayment: (id: number, proof: { razorpayOrderId: string; paymentId: string; signature: string }) =>
    post<OrderDTO>(`/orders/${id}/pay-confirm`, proof),
  tabs: () => call<TabDTO[]>("/tabs"),
  openTab: (input: { who: string; tableNo?: number }) => post<TabDTO>("/tabs", input),
  addTabItems: (id: number, items: { productId: number; qty: number }[]) =>
    post<TabDTO>(`/tabs/${id}/items`, { items }),
  settleTab: (id: number, payMethod: "CASH" | "CARD" | "UPI" | "ONLINE") =>
    post<TabDTO>(`/tabs/${id}/settle`, { payMethod }),
  createEnquiry: (input: { name: string; contact: string; interest: string; message?: string }) =>
    post<EnquiryDTO>("/enquiries", input),
  enquiries: () => call<EnquiryDTO[]>("/enquiries"),
  updateEnquiry: (id: number, patch: { status?: EnquiryDTO["status"]; note?: string }) =>
    call<EnquiryDTO>(`/enquiries/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  convertEnquiry: (id: number, planCode: string) => post<EnquiryDTO>(`/enquiries/${id}/convert`, { planCode }),
  quoteEnquiry: (id: number, input: { planCode: string; amount: number; note?: string }) => post<EnquiryDTO>(`/enquiries/${id}/quote`, input),
  dashboard: (date?: string) => call<DashboardDTO>(`/dashboard${date ? `?date=${date}` : ""}`),
  barStats: (date?: string) => call<any>(`/bar/stats${date ? `?date=${date}` : ""}`),
  shopStats: (date?: string) => call<any>(`/shop/stats${date ? `?date=${date}` : ""}`),
  login: (email: string, password: string) => post<{ staff: StaffDTO }>("/auth/login", { email, password }),
  pinLogin: (role: string, pin: string, staffId?: number) =>
    post<{ staff: StaffDTO; token: string }>("/auth/pin-login", { role, pin, staffId }),
  staffProfiles: () =>
    call<{
      ok: boolean;
      staff: {
        id: number;
        name: string;
        role: string;
        roleLabel: string;
        hasCustomPin: boolean;
        defaultPin: string;
      }[];
    }>("/auth/staff-profiles"),
  staffPins: () => call<{ roles: RolePinDTO[]; staff: StaffMemberPinDTO[] }>("/staff/pins"),
  addStaff: (input: {
    name: string;
    email: string;
    role: "FRONT_DESK" | "BAR" | "SHOP" | "STAFF" | string;
    hourlyRate?: number;
    pin?: string;
  }) => post<{ ok: boolean; message: string; staff: any }>("/staff", input),
  removeStaff: (id: number) => call<{ ok: boolean; message: string }>(`/staff/${id}`, { method: "DELETE" }),
  updateStaffPin: (staffId: number, pin: string) =>
    post<{ ok: boolean; message: string }>("/staff/pins", { staffId, pin }),
  resetStaffPin: (staffId: number) =>
    post<{ ok: boolean; message: string }>("/staff/pins", { staffId, reset: true }),
  updateStaffRate: (staffId: number, hourlyRate: number) =>
    post<{ ok: boolean; message: string }>("/staff/rate", { staffId, hourlyRate }),
  payStaffSalary: (input: { staffId: number; amount: number; month?: string; paymentRef?: string }) =>
    post<{ ok: boolean; message: string; paymentRef: string; paidAt: string }>("/staff/pay-salary", input),
  toggleStaffClock: (staffId?: number) =>
    post<{ ok: boolean; status: string; hours?: number; message: string }>("/staff/clock", { staffId }),
  updateRolePin: (role: string, pin: string) => post<{ ok: boolean; message: string }>("/staff/pins", { role, pin }),
  resetRolePin: (role: string) => post<{ ok: boolean; message: string }>("/staff/pins", { role, reset: true }),
  logout: () => post<{ ok: boolean }>("/auth/logout"),
  me: () => call<{ staff: StaffDTO }>("/auth/me"),
  memberSignup: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    planCode?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    dateOfBirth?: string;
  }) =>
    post<{ ok: boolean; member: MemberSessionDTO }>("/auth/member/signup", input),
  memberLogin: (input: { identifier: string; password: string } | string, password?: string) => {
    if (typeof input === "string") {
      return post<{ member: MemberSessionDTO }>("/member/login", { email: input, password });
    }
    return post<{ ok: boolean; member: MemberSessionDTO }>("/auth/member/login", input);
  },
  googleDemoLogin: (data: { email: string; name?: string; planCode?: string }) =>
    post<{ ok: boolean; member: MemberSessionDTO; token: string }>("/auth/google/demo", data),
  memberLogout: () => post<{ ok: boolean }>("/auth/member/logout"),
  memberMe: () => call<{ member: MemberSessionDTO | null }>("/auth/member/me"),
  memberHome: () => call<MemberHomeDTO>("/member/me"),
  buyPlan: (planCode: string) => post<{ ok: boolean; member: MemberDTO }>("/members/buy-plan", { planCode }),
  memberBook: (input: { courtId: number; date: string; start: number }) => post<BookingDTO>("/member/bookings", input),
  memberOrder: (input: { items: { productId: number; qty: number }[]; payMethod: "CASH" | "CARD" | "UPI"; fulfilment?: "PICKUP" | "DELIVERY"; address?: string; payOnline?: boolean }) => post<OrderDTO & { razorpayOrderId?: string }>("/member/orders", input),
};
