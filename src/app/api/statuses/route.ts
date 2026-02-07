import { NextResponse } from "next/server";
import { listStatuses } from "@/lib/coda-client";

let cachedStatuses: Awaited<ReturnType<typeof listStatuses>> | null = null;

export async function GET() {
  try {
    if (!cachedStatuses) {
      cachedStatuses = await listStatuses();
    }
    return NextResponse.json(cachedStatuses);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
