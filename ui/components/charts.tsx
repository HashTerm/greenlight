'use client'

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
} from 'recharts'
import type { Prompt } from '@/lib/greenlight-client'
import { DashboardEmptyMessage } from '@/components/dashboard-empty-message'

const axisProps = {
  stroke: 'var(--muted-foreground)',
  tick: { fill: 'var(--muted-foreground)' },
}

export function PlatformChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([platform, count]) => ({
    platform,
    count,
  }))

  if (!chartData.length) {
    return <DashboardEmptyMessage>No channels registered yet.</DashboardEmptyMessage>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="platform" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PromptStatsChart({ prompts }: { prompts: Prompt[] }) {
  const byDay = new Map<string, { day: string; created: number; answered: number }>()

  for (const p of prompts) {
    const day = p.created_at.slice(0, 10)
    const entry = byDay.get(day) ?? { day, created: 0, answered: 0 }
    entry.created += 1
    if (p.answered_at) {
      const aDay = p.answered_at.slice(0, 10)
      const aEntry = byDay.get(aDay) ?? { day: aDay, created: 0, answered: 0 }
      aEntry.answered += 1
      byDay.set(aDay, aEntry)
    }
    byDay.set(day, entry)
  }

  const chartData = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-14)

  if (!chartData.length) {
    return <DashboardEmptyMessage>No prompt activity yet.</DashboardEmptyMessage>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="day" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip />
          <Line type="monotone" dataKey="created" stroke="var(--chart-2)" name="Created" />
          <Line type="monotone" dataKey="answered" stroke="var(--primary)" name="Answered" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
