import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID } from "@/lib/auth";
import { kvGet, kvSet, KV_KEYS } from "@/lib/kv";

export async function POST() {
  try {
    const credentialJson = await kvGet(KV_KEYS.CREDENTIAL);
    if (!credentialJson) {
      return NextResponse.json({ error: "No credential registered" }, { status: 400 });
    }

    const credential = JSON.parse(credentialJson);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{ id: credential.id }],
      userVerification: "preferred",
    });

    await kvSet(KV_KEYS.CHALLENGE, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
