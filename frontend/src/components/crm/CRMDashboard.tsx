'use client';

interface CRMDashboardProps {
  stats: {
    total: number;
    new: number;
    qualified: number;
    unqualified: number;
  };
}

const blocks: { label: string; key: keyof CRMDashboardProps['stats'] }[] = [
  { label: 'Total', key: 'total' },
  { label: 'Qualified', key: 'qualified' },
  { label: 'Unqualified', key: 'unqualified' },
];

export default function CRMDashboard({ stats }: CRMDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {blocks.map((b) => (
        <div key={b.key} className="card p-4">
          <p className="text-xs text-zinc-500">{b.label}</p>
          <p className="text-xl font-semibold text-white mt-1">{stats[b.key]}</p>
        </div>
      ))}
    </div>
  );
}
