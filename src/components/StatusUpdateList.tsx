import type { StatusUpdate } from "@/lib/types";

const statusEmoji: Record<string, string> = {
  "On track": "🟢",
  "At risk": "🟡",
  "Off track": "🔴",
};

export function StatusUpdateList({ updates }: { updates: StatusUpdate[] }) {
  if (updates.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-4">No status updates yet</p>;
  }

  return (
    <div className="space-y-2">
      {updates.map((u) => (
        <div key={u.id} className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3">
          <span className="text-lg">{statusEmoji[u.status] || "⚪"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{u.date}</p>
            {u.update && <p className="text-sm text-gray-700 mt-0.5">{u.update}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
