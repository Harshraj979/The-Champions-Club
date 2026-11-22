import { api } from "./api";

// Runs Razorpay checkout (test mode) for an order placed with
// payOnline, then confirms the signed proof with our own API —
// only the server's signature check marks the order PAID. There is
// no demo path: a payment window that fails to load, or a checkout
// that throws, is an error the shopper sees — never a silent "paid".
declare global {
  interface Window {
    Razorpay?: any;
  }
}

export async function payOnlineWithRazorpay(
  order: { id: number; total: number; razorpayOrderId?: string },
  keyId: string,
): Promise<"paid" | "closed"> {
  if (!order.razorpayOrderId) throw new Error("Online payment was not started for this order");
  if (!keyId || keyId.includes("demo"))
    throw new Error("Online payment is not switched on yet. Pay at the counter instead.");

  await new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection and try again."));
    document.body.appendChild(s);
  });

  return new Promise<"paid" | "closed">((resolve, reject) => {
    let rzp: any;
    try {
      rzp = new window.Razorpay({
        key: keyId,
        order_id: order.razorpayOrderId,
        amount: order.total * 100,
        currency: "INR",
        name: "The Champions Club",
        description: `Shop order #${order.id}`,
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api.confirmPayment(order.id, {
              razorpayOrderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
            });
            resolve("paid");
          } catch (e) {
            reject(e instanceof Error ? e : new Error("Payment could not be verified"));
          }
        },
        modal: { ondismiss: () => resolve("closed") },
      });
    } catch {
      reject(new Error("The payment window could not be opened. Pay at the counter instead."));
      return;
    }
    rzp.open();
  });
}
