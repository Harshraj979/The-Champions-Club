import { ApiError } from "./errors";

// Tiny per-IP in-memory limiter for the public auth and enquiry
// routes. No store, no dependency: one Map of counters per key,
// reset when the window passes. A server restart clears it, which
// is fine for a brute-force brake, not an audit log.
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function checkRateLimit(req: Request, key: string, max: number, windowMs: number): void {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(bucketKey);
  if (!entry || entry.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > max) {
    throw new ApiError(429, "Too many attempts — please wait a few minutes and try again");
  }
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
}

// 10 tries per 10 minutes on any sign-in route.
export const limitLogin = (req: Request) => checkRateLimit(req, "login", 10, 10 * 60 * 1000);

// 20 enquiries per hour from one address.
export const limitEnquiry = (req: Request) => checkRateLimit(req, "enquiry", 20, 60 * 60 * 1000);
