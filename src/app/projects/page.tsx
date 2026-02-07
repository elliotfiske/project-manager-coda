"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import Link from "next/link";

const stageBadgeColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Planned: "bg-blue-100 text-blue-800",
  Idea: "bg-yellow-100 text-yellow-800",
  Complete: "bg-gray-100 text-gray-800",
  Blocked: "bg-red-100 text-red-800",
  Incomplete: "bg-orange-100 text-orange-800",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Omit<Project, "statusUpdates">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Loading projects...</p></div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">All Projects</h1>
      <div className="space-y-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block">
            <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.startDate} — {p.endDate}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ml-2 whitespace-nowrap ${stageBadgeColors[p.stage] || "bg-gray-100"}`}>
                {p.stage}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
