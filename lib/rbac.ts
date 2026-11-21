export type Role = "customer" | "employee" | "owner";

export const ROLES: Role[] = ["customer", "employee", "owner"];

// shortcut: client-side role check; replace with session token / server middleware when auth backend lands
export function canAccess(currentRole: Role, requiredRole: Role): boolean {
  if (requiredRole === "customer") return true;
  if (requiredRole === "employee") return currentRole === "employee" || currentRole === "owner";
  if (requiredRole === "owner") return currentRole === "owner";
  return false;
}
