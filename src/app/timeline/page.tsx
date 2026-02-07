"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { GanttChart } from "@/components/GanttChart";

export default function TimelinePage() {
  const [projects, setProjects] = useState<Omit<Project, "statusUpdates">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Loading timeline...</p></div>;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filtered = projects.filter(
    (p) => p.startDate && p.endDate && new Date(p.endDate) >= thirtyDaysAgo
  );

  return (
    <div className="p-4 flex flex-col h-[calc(100dvh-4rem)]">
      <h1 className="text-2xl font-bold mb-4">Timeline</h1>
      {filtered.length === 0 ? (
        <p className="text-gray-500">No projects with dates found.</p>
      ) : (
        <GanttChart projects={filtered} />
      )}
    </div>
  );
}
