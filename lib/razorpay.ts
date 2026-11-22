import { createHmac, timingSafeEqual } from "crypto";
import { badRequest, forbidden } from "./errors";

// Razorpay in TEST mode. Keys come from the environment
// (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET); without them the online
// option simply does not appear and counter payments carry on.
// No SDK — the two calls we need are plain REST + an HMAC check.
const keyId = () => process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim();

export const razorpayConfigured = () => Boolean(keyId() && keySecret());
export const razorpayKeyId = () => keyId() ?? null;

export async function createRazorpayOrder(amountInr: number, receipt: string): Promise<string> {
  if (!razorpayConfigured())
    throw badRequest("Online payment is not switched on yet. Pay at the counter instead.");
  if (!Number.isFinite(amountInr) || amountInr < 1)
    throw badRequest("Online payment needs an amount of at least ₹1");
  let res: Response;
  try {
    res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
      },
      body: JSON.stringify({ amount: Math.round(amountInr * 100), currency: "INR", receipt }),
    });
  } catch {
    throw badRequest("Online payment could not be started. Pay at the counter instead.");
  }
  if (!res.ok) {
    // Surface Razorpay's own reason (bad key, bad amount, ...) instead
    // of one generic line, so a real misconfiguration is diagnosable.
    const detail = await res.text().catch(() => "");
    let reason = "";
    try {
      reason = (JSON.parse(detail) as { error?: { description?: string } })?.error?.description ?? "";
    } catch {
      // Not JSON — keep the generic message below.
    }
    throw badRequest(
      reason ? `Online payment could not be started: ${reason}` : "Online payment could not be started. Pay at the counter instead.",
    );
  }
  const data = (await res.json()) as { id?: string };
  if (!data?.id) throw badRequest("Online payment could not be started. Pay at the counter instead.");
  return data.id;
}

// Verifies a plan purchase / renewal payment: the signature must check
// out AND Razorpay must confirm this payment was captured for this
// order, for exactly the expected amount. The signature alone does not
// bind the amount — a ₹1 payment for a Gold plan would pass it.
export async function verifyRazorpayPayment(
  razorpayOrderId: string,
  paymentId: string,
  signature: string,
  expectedAmountInr: number,
): Promise<void> {
  if (!verifyPaymentSignature(razorpayOrderId, paymentId, signature))
    throw forbidden("Payment could not be verified");
  let res: Response;
  try {
    res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
      },
    });
  } catch {
    throw forbidden("Payment could not be verified");
  }
  if (!res.ok) throw forbidden("Payment could not be verified");
  const data = (await res.json()) as { order_id?: string; status?: string; amount?: number };
  if (
    data.order_id !== razorpayOrderId ||
    data.status !== "captured" ||
    data.amount !== Math.round(expectedAmountInr * 100)
  )
    throw forbidden("Payment could not be verified");
}

export function verifyPaymentSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  const secret = keySecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${razorpayOrderId}|${paymentId}`).digest();
  // Compare in constant time, on equal-length buffers: a plain ===
  // on hex strings leaks how many leading characters matched.
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}
