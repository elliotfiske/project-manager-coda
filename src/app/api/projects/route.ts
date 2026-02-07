import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/coda-client";
import type { CreateProjectRequest } from "@/lib/types";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json();
    const result = await createProject(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
