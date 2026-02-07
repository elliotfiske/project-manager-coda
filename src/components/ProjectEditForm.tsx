"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Project, LookupItem, StageName } from "@/lib/types";

interface Props {
  project: Project;
  onSaved: () => void;
}

export function ProjectEditForm({ project, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [benefit, setBenefit] = useState(project.benefit);
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate);
  const [stage, setStage] = useState<StageName>(project.stage);
  const [tags, setTags] = useState<string[]>(project.tags);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<LookupItem[]>([]);
  const [allTags, setAllTags] = useState<LookupItem[]>([]);

  useEffect(() => {
    api.listStages().then(setStages);
    api.listTags().then(setAllTags);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateProject(project.id, {
        name, description, benefit, startDate, endDate, stage, tags,
      });
      onSaved();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tagName: string) {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Benefit</label>
        <textarea value={benefit} onChange={(e) => setBenefit(e.target.value)}
          rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as StageName)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          {stages.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button key={t.id} onClick={() => toggleTag(t.name)}
              className={`px-3 py-1 rounded-full text-sm border ${
                tags.includes(t.name)
                  ? "bg-blue-100 border-blue-400 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
