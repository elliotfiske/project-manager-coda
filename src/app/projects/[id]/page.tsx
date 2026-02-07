"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { StatusEntryForm } from "@/components/StatusEntryForm";
import { StatusUpdateList } from "@/components/StatusUpdateList";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    try {
      const data = await api.getProject(id);
      setProject(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading || !project) {
    return <div className="p-4"><p className="text-gray-500">Loading project...</p></div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <ProjectEditForm project={project} onSaved={loadProject} />

      <hr className="border-gray-200" />

      <StatusEntryForm
        initiativeId={project.id}
        projectName={project.name}
        onSubmitted={loadProject}
      />

      <h3 className="font-semibold text-gray-700">Status Updates</h3>
      <StatusUpdateList updates={project.statusUpdates} />
    </div>
  );
}
