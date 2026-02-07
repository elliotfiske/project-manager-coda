"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";

const stageColors: Record<string, string> = {
  Active: "#22c55e",
  Planned: "#3b82f6",
  Idea: "#eab308",
  Complete: "#9ca3af",
  Blocked: "#ef4444",
  Incomplete: "#f97316",
};

interface Props {
  projects: Omit<Project, "statusUpdates">[];
}

export function GanttChart({ projects }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<unknown>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || projects.length === 0) return;

    // Dynamic import to avoid SSR issues
    import("frappe-gantt").then(({ default: Gantt }) => {
      // Clear previous
      containerRef.current!.innerHTML = "";

      const tasks = projects
        .filter((p) => p.startDate && p.endDate)
        .map((p) => ({
          id: p.id,
          name: p.name,
          start: p.startDate,
          end: p.endDate,
          progress: p.stage === "Complete" ? 100 : 0,
          custom_class: `stage-${p.stage.toLowerCase()}`,
        }));

      if (tasks.length === 0) return;

      ganttRef.current = new Gantt(containerRef.current!, tasks, {
        view_mode: "Week",
        readonly: true,
        on_click: (task: { id: string }) => {
          router.push(`/projects/${task.id}`);
        },
      });
    });
  }, [projects, router]);

  return (
    <>
      <style>{`
        ${Object.entries(stageColors)
          .map(
            ([stage, color]) =>
              `.stage-${stage.toLowerCase()} .bar { fill: ${color} !important; }
               .stage-${stage.toLowerCase()} .bar-progress { fill: ${color} !important; }`
          )
          .join("\n")}
      `}</style>
      <div ref={containerRef} className="overflow-x-auto" />
    </>
  );
}
