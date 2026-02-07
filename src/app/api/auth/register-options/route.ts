import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { rpName, rpID } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();

    // Verify setup secret
    if (secret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: "Invalid setup secret" }, { status: 403 });
    }

    // Check if already registered
    const registered = await kvGet(KV_KEYS.REGISTERED);
    if (registered) {
      return NextResponse.json({ error: "Already registered" }, { status: 400 });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: "admin",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge for verification
    await kvSet(KV_KEYS.CHALLENGE, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
