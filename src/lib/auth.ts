import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const SESSION_COOKIE = "pm-session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const rpName = "Project Manager";
export const rpID = process.env.NODE_ENV === "production"
  ? process.env.NEXT_PUBLIC_RP_ID || "your-app.vercel.app"
  : "localhost";
export const origin = process.env.NODE_ENV === "production"
  ? `https://${rpID}`
  : "http://localhost:3000";

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SESSION_SECRET);
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}
