"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { StatusName } from "@/lib/types";

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const statusOptions: { name: StatusName; emoji: string; color: string }[] = [
  { name: "On track", emoji: "🟢", color: "bg-green-100 border-green-400 text-green-800" },
  { name: "At risk", emoji: "🟡", color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  { name: "Off track", emoji: "🔴", color: "bg-red-100 border-red-400 text-red-800" },
];

interface Props {
  initiativeId: string;
  projectName: string;
  onSubmitted: () => void;
}

export function StatusEntryForm({ initiativeId, projectName, onSubmitted }: Props) {
  const [date, setDate] = useState(getYesterday());
  const [status, setStatus] = useState<StatusName | null>(null);
  const [update, setUpdate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!status) return;
    setSubmitting(true);
    setError("");
    try {
      await api.createStatusUpdate({
        date,
        status,
        update,
        initiativeId: projectName,
      });
      setStatus(null);
      setUpdate("");
      setDate(getYesterday());
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold mb-3">Log Status Update</h3>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm"
      />

      <div className="flex gap-2 mb-3">
        {statusOptions.map((opt) => (
          <button
            key={opt.name}
            onClick={() => setStatus(opt.name)}
            className={`flex-1 py-3 rounded-lg border-2 text-center text-sm font-medium transition-all ${
              status === opt.name ? opt.color + " border-current" : "bg-gray-50 border-gray-200 text-gray-600"
            }`}
          >
            <span className="text-lg block">{opt.emoji}</span>
            {opt.name}
          </button>
        ))}
      </div>

      <textarea
        value={update}
        onChange={(e) => setUpdate(e.target.value)}
        placeholder="What did you work on? (optional)"
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={!status || submitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Log Update"}
      </button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
