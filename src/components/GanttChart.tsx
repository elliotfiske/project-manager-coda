"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import type { Project } from "@/lib/types";

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Tooltip({ task, fontSize, fontFamily }: { task: Task; fontSize: string; fontFamily: string }) {
  return (
    <div style={{ padding: "8px 12px", fontSize, fontFamily, background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", borderRadius: 4 }}>
      <b>{task.name}</b>
      <br />
      {fmtDate(task.start)} — {fmtDate(task.end)}
    </div>
  );
}

const stageColors: Record<string, string> = {
  Active: "#3b82f6",
  Planned: "#a78bfa",
  Idea: "#eab308",
  Complete: "#22c55e",
  Blocked: "#ef4444",
  Incomplete: "#f97316",
};

interface Props {
  projects: Omit<Project, "statusUpdates">[];
}

export function GanttChart({ projects }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400); // Default fallback height

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set initial height from current dimensions
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) {
      setHeight(Math.floor(rect.height));
    }

    const obs = new ResizeObserver(([entry]) => {
      setHeight(Math.floor(entry.contentRect.height));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tasks: Task[] = useMemo(
    () =>
      [...projects]
        .filter((p) => p.startDate && p.endDate)
        .sort((a, b) => b.endDate!.localeCompare(a.endDate!))
        .map((p) => ({
          id: p.id,
          name: p.name,
          start: new Date(p.startDate!),
          end: new Date(p.endDate!),
          type: "task" as const,
          progress: p.stage === "Complete" ? 100 : 0,
          isDisabled: true,
          styles: {
            backgroundColor: stageColors[p.stage] ?? "#6b7280",
            progressColor: stageColors[p.stage] ?? "#6b7280",
          },
        })),
    [projects]
  );

  if (tasks.length === 0) return null;

  return (
    <div ref={containerRef} className="flex-1 min-h-0">
      {height > 0 && (
        <Gantt
          tasks={tasks}
          viewMode={ViewMode.Week}
          onClick={(task) => router.push(`/projects/${task.id}`)}
          listCellWidth=""
          ganttHeight={height}
          columnWidth={50}
          TooltipContent={Tooltip}
        />
      )}
    </div>
  );
}
