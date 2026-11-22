import { redirect } from "next/navigation";

// Legacy route: redirected permanently to /member-login
export default function LegacyMemberLogin() {
  redirect("/member-login");
}
