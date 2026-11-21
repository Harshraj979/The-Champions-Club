import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_dev_mock_key");

export let lastDevOTP: { email: string; otp: string; at: number } | null = null;

export async function sendOTPEmail({ email, otp }: { email: string; otp: string }): Promise<{ ok: boolean; devMode?: boolean; error?: string }> {
  lastDevOTP = { email, otp, at: Date.now() };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_dev")) {
    console.log(`[Resend Dev Mode] OTP for ${email}: ${otp}`);
    return { ok: true, devMode: true };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || "The Champions Club <onboarding@resend.dev>";
    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `Your Login Code: ${otp}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #171b17; max-width: 480px; margin: 0 auto; border: 1px solid rgba(23,27,23,0.12); border-radius: 8px;">
          <h2 style="margin-top: 0;">The Champions Club</h2>
          <p>Here is your one-time verification code to sign in:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f6f4ee; border-radius: 6px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #626a60; font-size: 13px;">This code expires in 5 minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
    if (result.error) {
      console.warn("[Resend Warning] API returned error, falling back to local OTP:", result.error);
      return { ok: true, devMode: true, error: result.error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn("[Resend Warning] Failed to reach Resend API, falling back to local OTP:", err?.message);
    return { ok: true, devMode: true, error: err?.message };
  }
}
