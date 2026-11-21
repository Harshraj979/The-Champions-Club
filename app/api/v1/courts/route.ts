import { handle } from "@/lib/http";
import { listCourts } from "@/lib/services/catalog";

export const GET = () => handle(() => listCourts());
