import { NextResponse } from "next/server";
import { listTags } from "@/lib/coda-client";

let cachedTags: Awaited<ReturnType<typeof listTags>> | null = null;

export async function GET() {
  try {
    if (!cachedTags) {
      cachedTags = await listTags();
    }
    return NextResponse.json(cachedTags);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
