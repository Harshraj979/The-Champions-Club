// Minimal Odoo JSON-RPC client. Server-only: never import from client components.
// shortcut: session auth per call (authenticate + execute_kw). Fine at club scale;
// upgrade to a pooled session only if call volume ever demands it.
const URL = process.env.ODOO_URL ?? "http://localhost:8069";
const DB = process.env.ODOO_DB ?? "champions_club";
const USER = process.env.ODOO_USERNAME ?? "";
const PASS = process.env.ODOO_PASSWORD ?? "";

export class OdooError extends Error {}

async function rpc(service: string, method: string, args: unknown[]) {
  const res = await fetch(`${URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call",
      params: { service, method, args }, id: Date.now() }),
  });
  const data = await res.json();
  if (data.error) throw new OdooError(data.error.data?.message ?? data.error.message ?? "Odoo error");
  return data.result;
}

let uidCache: number | null = null;
async function uid(): Promise<number> {
  if (uidCache) return uidCache;
  uidCache = await rpc("common", "authenticate", [DB, USER, PASS, {}]);
  if (!uidCache) throw new OdooError("Odoo authentication failed - check ODOO_USERNAME/ODOO_PASSWORD");
  return uidCache;
}

export async function executeKw<T>(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<T> {
  return rpc("object", "execute_kw", [DB, await uid(), PASS, model, method, args, kwargs]) as Promise<T>;
}
export const searchRead = <T>(model: string, domain: unknown[], fields: string[], limit = 80) =>
  executeKw<T[]>(model, "search_read", [domain], { fields, limit });
export const createRecord = (model: string, vals: Record<string, unknown>) =>
  executeKw<number>(model, "create", [vals]);
