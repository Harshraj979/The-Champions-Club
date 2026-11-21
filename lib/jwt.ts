export type Role = "customer" | "employee" | "owner";

export type JWTPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  exp?: number;
};

const SECRET = process.env.JWT_SECRET || "champions-club-jwt-secret-key-at-least-32-chars!";
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload: JWTPayload, expiresInSec = 86400 * 7): Promise<string> {
  const key = await getHmacKey();
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const claims = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec };
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, b, s] = parts;
    const key = await getHmacKey();
    const sigBytes = unb64url(s);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes as unknown as BufferSource, enc.encode(`${h}.${b}`));
    if (!valid) return null;
    const payload = JSON.parse(dec.decode(unb64url(b))) as JWTPayload;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
