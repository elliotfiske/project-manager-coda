import { BrowserContext } from "@playwright/test";

export async function bypassAuth(context: BrowserContext) {
  // Set a session cookie that the middleware will accept.
  // In tests, the middleware is bypassed by the mock routes anyway,
  // but this prevents redirects to /login.
  await context.addCookies([
    {
      name: "pm-session",
      value: "test-session-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
