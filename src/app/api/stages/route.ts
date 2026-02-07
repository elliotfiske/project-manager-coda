import { NextResponse } from "next/server";
import { listStages } from "@/lib/coda-client";

let cachedStages: Awaited<ReturnType<typeof listStages>> | null = null;

export async function GET() {
  try {
    if (!cachedStages) {
      cachedStages = await listStages();
    }
    return NextResponse.json(cachedStages);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
