import { BrowserContext } from "@playwright/test";
import { SignJWT } from "jose";

export async function bypassAuth(context: BrowserContext) {
  // Create a valid JWT session token for tests
  const sessionSecret = new TextEncoder().encode(
    process.env.SESSION_SECRET || "change-me-to-a-random-string-at-least-32-chars-long"
  );

  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret);

  await context.addCookies([
    {
      name: "pm-session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
