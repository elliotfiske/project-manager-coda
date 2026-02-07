"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { ActiveProjectResponse, Project } from "@/lib/types";
import { ActiveProjectCard } from "@/components/ActiveProjectCard";
import { StatusEntryForm } from "@/components/StatusEntryForm";
import { StatusUpdateList } from "@/components/StatusUpdateList";
import { ActiveProjectErrors } from "@/components/ActiveProjectErrors";

export default function HomePage() {
  const [data, setData] = useState<ActiveProjectResponse | null>(null);
  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const activeData = await api.getActiveProject();
      setData(activeData);
      if (activeData.project) {
        const full = await api.getProject(activeData.project.id);
        setFullProject(full);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Active Project</h1>

      {data?.errors && data.errors.length > 0 && (
        <ActiveProjectErrors errors={data.errors} />
      )}

      {fullProject && (
        <>
          <ActiveProjectCard project={fullProject} />
          <StatusEntryForm
            initiativeId={fullProject.id}
            projectName={fullProject.name}
            onSubmitted={loadData}
          />
          <h3 className="font-semibold text-gray-700">Recent Updates</h3>
          <StatusUpdateList updates={fullProject.statusUpdates.slice(0, 7)} />
        </>
      )}

      {!data?.project && data?.errors.length === 0 && (
        <p className="text-gray-500">No active project found.</p>
      )}
    </div>
  );
}
