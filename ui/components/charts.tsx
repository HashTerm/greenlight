"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Prompt } from "@/lib/greenlight-client";

export function PlatformChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([platform, count]) => ({
    platform,
    count,
  }));

  if (!chartData.length) {
    return <p className="text-sm text-neutral-500">No channels registered yet.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="platform" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#171717" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PromptStatsChart({ prompts }: { prompts: Prompt[] }) {
  const byDay = new Map<string, { day: string; created: number; answered: number }>();

  for (const p of prompts) {
    const day = p.created_at.slice(0, 10);
    const entry = byDay.get(day) ?? { day, created: 0, answered: 0 };
    entry.created += 1;
    if (p.answered_at) {
      const aDay = p.answered_at.slice(0, 10);
      const aEntry = byDay.get(aDay) ?? { day: aDay, created: 0, answered: 0 };
      aEntry.answered += 1;
      byDay.set(aDay, aEntry);
    }
    byDay.set(day, entry);
  }

  const chartData = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-14);

  if (!chartData.length) {
    return <p className="text-sm text-neutral-500">No prompt activity yet.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="created" stroke="#171717" name="Created" />
          <Line type="monotone" dataKey="answered" stroke="#16a34a" name="Answered" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
