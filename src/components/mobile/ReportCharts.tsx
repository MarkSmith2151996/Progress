'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Win95 inset panel wrapper
const InsetPanel: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <div style={{
    background: '#fff',
    border: '2px solid',
    borderColor: '#808080 #dfdfdf #dfdfdf #808080',
    boxShadow: 'inset 1px 1px 0 #0a0a0a',
    padding: '8px 6px',
    marginBottom: 12,
  }}>
    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#000080', marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </div>
);

// Win95-styled tooltip
const Win95Tooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#c0c0c0',
      border: '2px solid',
      borderColor: '#dfdfdf #808080 #808080 #dfdfdf',
      padding: '4px 8px',
      fontSize: 10,
      fontFamily: "'MS Sans Serif', sans-serif",
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
};

export interface WeekScoreData {
  label: string;
  score: number;
}

export interface CategoryData {
  label: string;
  tasks: number;
  habits: number;
  logging: number;
  goals: number;
}

export const ScoreTrendChart: React.FC<{ data: WeekScoreData[] }> = ({ data }) => (
  <InsetPanel label="Score Trend (8 Weeks)">
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#808080' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#808080' }} />
        <Tooltip content={<Win95Tooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#000080"
          strokeWidth={2}
          dot={{ r: 3, fill: '#000080' }}
          name="Score"
        />
      </LineChart>
    </ResponsiveContainer>
  </InsetPanel>
);

export const CategoryBreakdownChart: React.FC<{ data: CategoryData[] }> = ({ data }) => (
  <InsetPanel label="Category Breakdown (8 Weeks)">
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#808080' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#808080' }} />
        <Tooltip content={<Win95Tooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 10, fontFamily: "'MS Sans Serif', sans-serif" }}
          iconSize={8}
        />
        <Bar dataKey="tasks" name="Tasks" fill="#008000" barSize={6} />
        <Bar dataKey="habits" name="Habits" fill="#808000" barSize={6} />
        <Bar dataKey="logging" name="Logging" fill="#000080" barSize={6} />
        <Bar dataKey="goals" name="Goals" fill="#800000" barSize={6} />
      </BarChart>
    </ResponsiveContainer>
  </InsetPanel>
);
