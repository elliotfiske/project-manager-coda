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

export function ActiveProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold truncate">{project.name}</h2>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${stageBadgeColors[project.stage] || "bg-gray-100"}`}>
            {project.stage}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          {project.startDate} — {project.endDate}
        </p>
        {project.description && (
          <p className="text-sm text-gray-700 line-clamp-2">{project.description}</p>
        )}
      </div>
    </Link>
  );
}
