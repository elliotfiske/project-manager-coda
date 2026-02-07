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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Timeline</h1>
      {projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <GanttChart projects={projects} />
      )}
    </div>
  );
}
