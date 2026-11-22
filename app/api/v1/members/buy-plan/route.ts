import { handle, body } from "@/lib/http";
import { requireMember, requireStaff } from "@/lib/auth";
import { parse, buyPlanInput } from "@/lib/validate";
import { buyPlanForMember, createPlanPaymentOrder } from "@/lib/services/members";
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

// Buying a plan needs money behind it: either the signed Razorpay
// proof of a verified payment, or a staff-recorded counter receipt.
// With neither, the server mints the Razorpay order first and the
// client calls back with the proof to complete the purchase.
export const POST = (req: Request) =>
  handle(async () => {
    const member = await requireMember(req);
    const input = parse(buyPlanInput, await body(req));
    const proof = proofOf(input);
    if (proof) {
      const updated = await buyPlanForMember(member.id, input.planCode, { proof });
      return { ok: true, member: updated };
    }
    if (input.staffReceipt) {
      await requireStaff(req);
      const updated = await buyPlanForMember(member.id, input.planCode, {
        staffReceipt: true,
        payMethod: input.payMethod,
      });
      return { ok: true, member: updated };
    }
    const order = await createPlanPaymentOrder(member.id, input.planCode);
    return { ok: true, needsPayment: true, ...order };
  });
