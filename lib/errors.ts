// One error type for the whole API. Services throw these, route handlers
// turn them into a clean { error } body with the right status.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (m: string) => new ApiError(400, m);
export const unauthorized = (m = "Sign in required") => new ApiError(401, m);
export const forbidden = (m: string) => new ApiError(403, m);
export const notFound = (m = "Not found") => new ApiError(404, m);
export const conflict = (m: string) => new ApiError(409, m);
