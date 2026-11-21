import { handle } from "@/lib/http";
import { listPlans } from "@/lib/services/catalog";

export const GET = () => handle(() => listPlans());
