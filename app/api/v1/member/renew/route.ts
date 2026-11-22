import { handle, body } from "@/lib/http";
import { requireMember, requireStaff } from "@/lib/auth";
import { parse, renewInput } from "@/lib/validate";
import { createPlanPaymentOrder, renewMember } from "@/lib/services/members";
import type { PaymentProof } from "@/lib/services/members";

const proofOf = (input: {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}): PaymentProof | undefined =>
  input.razorpayOrderId && input.razorpayPaymentId && input.razorpaySignature
    ? {
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      }
    : undefined;

// A member renewing their own plan: identity comes from the session,
// never from the request body, and the renewal needs money behind it
// — a verified online payment, or a staff-recorded counter receipt.
// With neither, the server mints the Razorpay order first and the
// client calls back with the proof.
export const POST = (req: Request) =>
  handle(async () => {
    const session = await requireMember(req);
    const input = parse(renewInput, await body(req));
    const proof = proofOf(input);
    if (proof) return renewMember(session.id, { proof });
    if (input.staffReceipt) {
      await requireStaff(req);
      return renewMember(session.id, { staffReceipt: true, payMethod: input.payMethod });
    }
    const order = await createPlanPaymentOrder(session.id);
    return { needsPayment: true, ...order };
  });
