import { createRecord, searchRead } from "./client";

export type Member = {
  id: number; name: string; phone: string | false; email: string | false;
  club_plan_id: [number, string] | false; membership_state: string;
  membership_expiry: string | false; is_member: boolean;
};
const FIELDS = ["name", "phone", "email", "club_plan_id", "membership_state", "membership_expiry", "is_member"];

export function searchMembers(q: string) {
  const term = q.trim();
  const domain = term
    ? ["|", ["name", "ilike", term], ["phone", "ilike", term]]
    : [["club_plan_id", "!=", false]];
  return searchRead<Member>("res.partner", domain, FIELDS);
}

export async function createMember(input: { name: string; phone?: string; email?: string; planId: number; expiry: string }) {
  const id = await createRecord("res.partner", {
    name: input.name, phone: input.phone ?? false, email: input.email ?? false,
    club_plan_id: input.planId, member_since: new Date().toISOString().slice(0, 10),
    membership_expiry: input.expiry,
  });
  const [member] = await searchRead<Member>("res.partner", [["id", "=", id]], FIELDS, 1);
  return member;
}

// One partner id -> bookings (M3, arrives next), sale orders, invoices, POS orders.
// Models a later module has not created yet return [] instead of failing the page.
export async function getMemberHistory(partnerId: number) {
  const safe = async (model: string, fields: string[]) => {
    try { return await searchRead(model, [["partner_id", "=", partnerId]], fields, 20); }
    catch { return []; }
  };
  const [saleOrders, invoices, posOrders] = await Promise.all([
    safe("sale.order", ["name", "date_order", "amount_total", "state"]),
    safe("account.move", ["name", "invoice_date", "amount_total", "payment_state"]),
    safe("pos.order", ["name", "date_order", "amount_total"]),
  ]);
  return { saleOrders, invoices, posOrders };
}
