import { handle } from "@/lib/http";
import { requireStaff } from "@/lib/auth";

export const GET = (req: Request) => handle(async () => ({ staff: await requireStaff(req) }));
