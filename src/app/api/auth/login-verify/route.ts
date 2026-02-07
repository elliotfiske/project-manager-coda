import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { rpID, origin, createSession, sessionCookieOptions } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const expectedChallenge = await kvGet(KV_KEYS.CHALLENGE);
    const credentialJson = await kvGet(KV_KEYS.CREDENTIAL);

    if (!expectedChallenge || !credentialJson) {
      return NextResponse.json({ error: "Missing challenge or credential" }, { status: 400 });
    }

    const credential = JSON.parse(credentialJson);

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: Uint8Array.from(Buffer.from(credential.publicKey, "base64")),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Update counter
    await kvSet(KV_KEYS.CREDENTIAL, JSON.stringify({
      ...credential,
      counter: verification.authenticationInfo.newCounter,
    }));

    // Create session
    const token = await createSession();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    return NextResponse.json({ verified: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
