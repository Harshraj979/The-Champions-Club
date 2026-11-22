import type { BookingDTO, CourtDTO, DashboardDTO, EnquiryDTO, ExpenseDTO, ExpiringDTO, InvoiceDTO, LeaveDTO, MemberDTO, MemberHomeDTO, MemberSessionDTO, OrderDTO, PayrollDTO, PlanDTO, ProductDTO, RolePinDTO, ShiftDTO, StaffDTO, StaffMemberPinDTO, StaffRosterDTO, TabDTO, TaxSummaryDTO } from "./types";

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

// useApi threads one request's AbortSignal through here so a reload can
// cancel the fetch it supersedes. The signal is captured synchronously
// when fetch() is called, so concurrent hooks cannot clobber each other.
let fetchSignal: AbortSignal | undefined;
export function withFetchSignal<T>(signal: AbortSignal | undefined, fn: () => Promise<T>): Promise<T> {
  const prev = fetchSignal;
  fetchSignal = signal;
  try {
    return fn();
  } finally {
    fetchSignal = prev;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      signal: fetchSignal,
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

// Proof of a verified Razorpay payment, or a staff-recorded counter
// receipt, for buying or renewing a plan.
export type PlanPayment = {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  staffReceipt?: boolean;
  payMethod?: "CASH" | "CARD" | "UPI";
};

export const api = {
  plans: () => call<PlanDTO[]>("/plans"),
  courts: () => call<CourtDTO[]>("/courts"),
  products: (category?: "GEAR" | "BAR") =>
    call<ProductDTO[]>(`/products${category ? `?category=${category}` : ""}`),
  availability: (courtId: number, date: string) =>
    call<{ taken: { start: number; type: "REGULAR" | "TRIAL" | "FRIDAY_SOCIAL" }[] }>(`/availability?courtId=${courtId}&date=${date}`),
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
  payBooking: (id: number, payMethod: "CASH" | "CARD" | "UPI" | "ONLINE") =>
    post<BookingDTO>(`/bookings/${id}/pay`, { payMethod }),
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
  renewMember: (id: number, extra?: PlanPayment) => post<MemberDTO>(`/members/${id}/renew`, extra ?? {}),
  createOrder: (input: {
    items: { productId: number; qty: number }[];
    name: string;
    phone: string;
    payMethod: "CASH" | "CARD" | "UPI";
    fulfilment?: "PICKUP" | "DELIVERY";
    address?: string;
    payOnline?: boolean;
  }) => post<OrderDTO & { razorpayOrderId?: string }>("/orders", input),
  orders: (from?: string, to?: string, page?: number) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (page) q.set("page", String(page));
    const s = q.toString();
    return call<OrderDTO[]>(`/orders${s ? `?${s}` : ""}`);
  },
  payOrder: (id: number) => post<OrderDTO>(`/orders/${id}/pay`, {}),
  invoices: () => call<InvoiceDTO[]>("/invoices"),
  createInvoice: (input: { billedTo: string; detail?: string; amount: number; taxRate?: number }) => post<InvoiceDTO>("/invoices", input),
  taxSummary: (from: string, to: string) => call<TaxSummaryDTO>(`/reports/tax?from=${from}&to=${to}`),
  payInvoice: (id: number) => post<InvoiceDTO>(`/invoices/${id}/pay`, {}),
  expenses: () => call<ExpenseDTO[]>("/expenses"),
  createExpense: (input: { title: string; category?: string; amount: number; spentOn: string; note?: string }) => post<ExpenseDTO>("/expenses", input),
  payroll: () => call<PayrollDTO[]>("/payroll"),
  createPayroll: (input: { staffName: string; month: string; salary: number; leaveDays?: number; tax?: number }) => post<PayrollDTO>("/payroll", input),
  payPayroll: (id: number) => post<PayrollDTO>(`/payroll/${id}/pay`, {}),
  staffRoster: () => call<StaffRosterDTO[]>("/staff"),
  createStaff: (input: { name: string; email: string; password: string; role: StaffDTO["role"] }) =>
    post<StaffRosterDTO>("/staff", input),
  removeStaff: (id: number) => call<{ ok: boolean; message?: string }>(`/staff/${id}`, { method: "DELETE" }),
  shifts: (from: string, to: string) => call<ShiftDTO[]>(`/shifts?from=${from}&to=${to}`),
  assignShift: (input: { staffId: number; date: string; part: "MORNING" | "EVENING" }) => post<ShiftDTO>("/shifts", input),
  removeShift: (id: number) => call<{ ok: true }>(`/shifts/${id}`, { method: "DELETE" }),
  leaves: () => call<LeaveDTO[]>("/leave"),
  requestLeave: (input: { staffId: number; from: string; to: string; type: LeaveDTO["type"]; reason?: string }) =>
    post<LeaveDTO>("/leave", input),
  decideLeave: (id: number, status: "APPROVED" | "REJECTED") =>
    call<LeaveDTO>(`/leave/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
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
    post<{ staff: StaffDTO }>("/auth/pin-login", { role, pin, staffId }),
  staffProfiles: () =>
    call<{
      ok: boolean;
      staff: {
        id: number;
        name: string;
        role: string;
        roleLabel: string;
        hasCustomPin: boolean;
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
  updateStaffPin: (staffId: number, pin: string) =>
    post<{ ok: boolean; message: string }>("/staff/pins", { staffId, pin }),
  resetStaffPin: (staffId: number) =>
    post<{ ok: boolean; message: string }>("/staff/pins", { staffId, reset: true }),
  updateStaffRate: (staffId: number, hourlyRate: number) =>
    post<{ ok: boolean; message: string }>("/staff/rate", { staffId, hourlyRate }),
  payStaffSalary: (input: { staffId: number; amount: number; month?: string; paymentRef?: string }) =>
    post<{ ok: boolean; message: string; paymentRef: string | null; paidAt: string }>("/staff/pay-salary", input),
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
  // One member-login route (/member/login). The identifier may be an
  // email, phone number or name — the server's memberLogin accepts
  // all three.
  memberLogin: (input: { identifier: string; password: string } | string, password?: string) => {
    const email = typeof input === "string" ? input : input.identifier;
    const pass = typeof input === "string" ? password : input.password;
    return post<{ member: MemberSessionDTO }>("/member/login", { email, password: pass });
  },
  memberLogout: () => post<{ ok: boolean }>("/auth/member/logout"),
  memberMe: () => call<{ member: MemberSessionDTO | null }>("/auth/member/me"),
  memberHome: () => call<MemberHomeDTO>("/member/me"),
  // Buying or renewing a plan needs a verified payment: pass the
  // Razorpay proof, or (staff only) a recorded counter receipt. With
  // neither, the server mints a Razorpay order first and answers
  // { needsPayment: true, razorpayOrderId, amount } — call again
  // with the proof to complete the purchase.
  buyPlan: (planCode: string, extra?: PlanPayment) =>
    post<{ ok: boolean; member?: MemberDTO; needsPayment?: boolean; razorpayOrderId?: string; amount?: number }>(
      "/members/buy-plan",
      { planCode, ...extra },
    ),
  memberBook: (input: { courtId: number; date: string; start: number }) => post<BookingDTO>("/member/bookings", input),
  memberRenew: (extra?: PlanPayment) =>
    post<MemberDTO & { needsPayment?: boolean; razorpayOrderId?: string; amount?: number }>("/member/renew", extra ?? {}),
  changeMemberPlan: (id: number, planCode: string, staffReceipt?: boolean) =>
    post<MemberDTO>(`/members/${id}/plan`, { planCode, staffReceipt: staffReceipt ?? true }),
  cancelMyBooking: (id: number) => post<BookingDTO>(`/member/bookings/${id}/cancel`, {}),
  myRenewals: () =>
    call<{ id: number; planCode?: string; planName?: string; amount: number; renewedOn?: string; createdAt: string; expiresOn?: string }[]>("/member/renewals"),
  withdrawLeave: (id: number) => call<{ ok: boolean }>(`/leave/${id}`, { method: "DELETE" }),
  memberOrder: (input: { items: { productId: number; qty: number }[]; payMethod: "CASH" | "CARD" | "UPI"; fulfilment?: "PICKUP" | "DELIVERY"; address?: string; payOnline?: boolean }) => post<OrderDTO & { razorpayOrderId?: string }>("/member/orders", input),
};

// The signed proof a real Razorpay checkout hands back. It is a
// PlanPayment with every field present; buyPlan/memberRenew accept it
// through the broader PlanPayment parameter.
export type RazorpayProof = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

// Opens the real Razorpay checkout and resolves with the signed proof
// from its handler, or null when the member closes the window. The
// payment is never faked: if the checkout script cannot load, this
// throws instead of inventing a payment.
export async function openRazorpayCheckout(input: {
  keyId: string;
  orderId: string;
  amount: number;
  name?: string;
  description?: string;
}): Promise<RazorpayProof | null> {
  const win = window as unknown as { Razorpay?: any };
  if (!win.Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load the payment window"));
      document.body.appendChild(s);
    });
  }
  if (!win.Razorpay) throw new Error("Could not load the payment window");
  return new Promise<RazorpayProof | null>((resolve, reject) => {
    try {
      const rzp = new win.Razorpay({
        key: input.keyId,
        order_id: input.orderId,
        amount: Math.round(input.amount * 100),
        currency: "INR",
        name: input.name ?? "The Champions Club",
        description: input.description ?? "Club payment",
        handler: (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) =>
          resolve({
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          }),
        modal: { ondismiss: () => resolve(null) },
      });
      rzp.open();
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Could not open the payment window"));
    }
  });
}
