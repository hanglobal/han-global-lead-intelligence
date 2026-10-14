'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface LeadHunterDashboardProps {
  stats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

const blocks = [
  { label: 'Pending', key: 'pending' as const, color: 'text-zinc-400' },
  { label: 'Running', key: 'running' as const, color: 'text-zinc-200' },
  { label: 'Completed', key: 'completed' as const, color: 'text-white' },
  { label: 'Failed', key: 'failed' as const, color: 'text-zinc-500' },
];

export default function LeadHunterDashboard({ stats }: LeadHunterDashboardProps) {
  const [nexusBalance, setNexusBalance] = useState<{
    prepaid_balance?: number;
    pricing_per_1000_leads?: number;
    api_status?: string;
  } | null>(null);

  useEffect(() => {
    axios
      .get('/api/lead-hunter/nexus/balance/')
      .then((res) => {
        if (!res.data.error) setNexusBalance(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4 mb-6">
      {/* Nexus Status Banner */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-850">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 flex-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">B2B Prospect Sourcing Engine</h3>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium px-2 py-0.5 rounded-md uppercase">
                {nexusBalance?.api_status || 'Active'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Direct Decision-Maker Prospect Data & Contact Ingestion Provider
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {nexusBalance?.prepaid_balance !== undefined && (
            <div className="text-right">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Prepaid Balance</p>
              <p className="text-base font-bold text-zinc-100 tabular-nums">
                ${nexusBalance.prepaid_balance.toFixed(2)} USD
              </p>
            </div>
          )}
          {nexusBalance?.pricing_per_1000_leads !== undefined && (
            <div className="text-right border-l border-zinc-800 pl-4">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Rate</p>
              <p className="text-sm font-medium text-zinc-300">
                ${nexusBalance.pricing_per_1000_leads.toFixed(2)} / 1k leads
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {blocks.map((b) => (
          <div key={b.key} className="card p-3.5 bg-zinc-900/40 border border-zinc-800/80">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{b.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums ${b.color}`}>{stats[b.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
