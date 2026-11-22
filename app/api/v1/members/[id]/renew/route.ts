import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, renewInput } from "@/lib/validate";
import { renewMember } from "@/lib/services/members";
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

// The front desk renewing a member: the new term starts at the later
// of today and the current expiry, so an early renewal loses no days.
// Staff at the desk record a counter receipt (payMethod); an online
// renewal still needs its verified Razorpay proof.
export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Member id is required");
    const input = parse(renewInput, await body(req));
    const proof = proofOf(input);
    if (proof) return renewMember(id, { proof });
    return renewMember(id, { staffReceipt: true, payMethod: input.payMethod });
  });
