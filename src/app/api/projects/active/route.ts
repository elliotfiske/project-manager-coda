import { NextResponse } from "next/server";
import { getActiveProjects } from "@/lib/coda-client";
import type { ActiveProjectResponse } from "@/lib/types";

export async function GET() {
  try {
    const activeProjects = await getActiveProjects();

    const response: ActiveProjectResponse = {
      project: null,
      errors: [],
    };

    if (activeProjects.length === 0) {
      response.errors.push({ type: "no_active", message: "No active projects found" });
    } else if (activeProjects.length > 1) {
      response.errors.push({
        type: "multiple_active",
        message: `${activeProjects.length} active projects found`,
        projects: activeProjects.map((p) => ({ id: p.id, name: p.name })),
      });
    }

    if (activeProjects.length >= 1) {
      response.project = { ...activeProjects[0], statusUpdates: [] };
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
