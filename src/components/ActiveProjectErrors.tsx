"use client";

import { api } from "@/lib/api";
import type { ActiveProjectError } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ActiveProjectErrors({ errors }: { errors: ActiveProjectError[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSetOnlyActive(id: string) {
    setLoading(true);
    try {
      // Set all other active projects to Planned
      const multipleError = errors.find((e) => e.type === "multiple_active");
      if (multipleError && multipleError.type === "multiple_active") {
        for (const p of multipleError.projects) {
          if (p.id !== id) {
            await api.updateProject(p.id, { stage: "Planned" });
          }
        }
      }
      router.refresh();
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {errors.map((err, i) => (
        <div key={i} className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-amber-800 font-medium text-sm">{err.message}</p>
          {err.type === "no_active" && (
            <button
              onClick={() => router.push("/new")}
              className="mt-2 text-sm bg-amber-600 text-white px-4 py-2 rounded-lg"
            >
              Create New Project
            </button>
          )}
          {err.type === "multiple_active" && (
            <div className="mt-2 space-y-1">
              {err.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSetOnlyActive(p.id)}
                  disabled={loading}
                  className="block text-sm text-amber-700 underline disabled:opacity-50"
                >
                  Keep only &quot;{p.name}&quot; active
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
