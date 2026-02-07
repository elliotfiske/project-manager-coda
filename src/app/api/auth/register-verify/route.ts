import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { rpID, origin, createSession, sessionCookieOptions } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const expectedChallenge = await kvGet(KV_KEYS.CHALLENGE);

    if (!expectedChallenge) {
      return NextResponse.json({ error: "No challenge found" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Store credential
    const { credential } = verification.registrationInfo;
    await kvSet(KV_KEYS.CREDENTIAL, JSON.stringify({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
    }));
    await kvSet(KV_KEYS.REGISTERED, "true");

    // Create session
    const token = await createSession();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ verified: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
