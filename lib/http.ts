import { NextResponse } from "next/server";
import { ApiError } from "./errors";

// Route handlers stay thin: parse, call a service, return JSON. All
// errors funnel through here into the same { error } shape.
export async function handle<T>(fn: () => Promise<T> | T, status = 200) {
  try {
    return NextResponse.json(await fn(), { status });
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Something broke on our side" }, { status: 500 });
  }
}

export const body = async (req: Request): Promise<unknown> => {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Request body must be JSON");
  }
};
