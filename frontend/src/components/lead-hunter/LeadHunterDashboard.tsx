'use client';

interface LeadHunterDashboardProps {
  stats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

const blocks = [
  { label: 'Pending', key: 'pending' as const },
  { label: 'Running', key: 'running' as const },
  { label: 'Completed', key: 'completed' as const },
  { label: 'Failed', key: 'failed' as const },
];

export default function LeadHunterDashboard({ stats }: LeadHunterDashboardProps) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {blocks.map((b) => (
        <div key={b.key} className="card p-4">
          <p className="text-xs text-zinc-500">{b.label}</p>
          <p className="text-xl font-semibold text-white mt-1">{stats[b.key]}</p>
        </div>
      ))}
    </div>
  );
}
