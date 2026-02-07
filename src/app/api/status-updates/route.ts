import { NextRequest, NextResponse } from "next/server";
import { createStatusUpdate } from "@/lib/coda-client";
import type { CreateStatusUpdateRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateStatusUpdateRequest = await request.json();
    await createStatusUpdate(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
