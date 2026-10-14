'use client';
import { useState } from 'react';
import { formatEasternDateTime } from '@/lib/dateUtils';

interface DecisionMaker {
  id?: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  headline?: string;
  seniority_level?: string;
  functional_level?: string;
  email?: string;
  personal_email?: string;
  mobile_number?: string;
  linkedin?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface Lead {
  id: number;
  lid?: string;
  company_name: string;
  industry?: string;
  company_size?: string;
  company_annual_revenue?: string;
  company_annual_revenue_clean?: string;
  company_total_funding?: string;
  company_total_funding_clean?: string;
  rating?: number;
  review_count?: number;
  status: string;
  company_phone?: string;
  company_email?: string;
  company_full_address?: string;
  city?: string;
  state?: string;
  country?: string;
  score?: number | null;
  score_label?: 'hot' | 'warm' | 'cold' | null;
  stage?: string | null;
  decision_maker?: DecisionMaker | null;
  company_people?: DecisionMaker[];
  follow_up_date?: string | null;
  follow_up_time?: string | null;
  follow_up_status?: string | null;
  follow_up_action_type?: string | null;
  created_at?: string;
  ai_reasoning?: string | null;
}

interface LeadTableProps {
  loading: boolean;
  selectedLeads: Set<number>;
  filteredLeads: Lead[];
  onToggleSelection: (id: number) => void;
  onToggleAll: () => void;
  onOpenLead: (lead: Lead) => void;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up_scheduled: 'Follow-Up',
  in_discussion: 'Discussion',
  meeting_booked: 'Meeting',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  unqualified: 'Unqualified',
};



function MultiContactCell({ value, type }: { value?: string | null, type: 'phone' | 'email' }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-zinc-600">—</span>;

  const items = value.split(',').map(item => item.trim()).filter(Boolean);
  if (items.length === 0) return <span className="text-zinc-600">—</span>;

  const firstItem = items[0];
  const remainingCount = items.length - 1;

  const getHref = (item: string) => {
    return type === 'phone' ? `tel:${item.replace(/[^\d+]/g, '')}` : `mailto:${item}`;
  };

  return (
    <div className="flex items-center gap-1.5 relative" onClick={e => e.stopPropagation()}>
      <a href={getHref(firstItem)} className="hover:text-white transition-colors truncate max-w-[150px] inline-block align-bottom" title={firstItem}>
        {firstItem}
      </a>
      {remainingCount > 0 && (
        <div className="relative">
          <button 
            onClick={() => setOpen(!open)}
            title={`View ${remainingCount} more`}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[9px] font-medium min-w-[16px] h-[16px] flex items-center justify-center rounded-full leading-none px-1 shadow-sm transition-colors cursor-pointer z-10"
          >
            +{remainingCount}
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute top-full left-0 mt-1 w-max max-w-xs bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-fade-in text-left">
                {items.map((item, i) => (
                  <a 
                    key={i} 
                    href={getHref(item)} 
                    onClick={() => setOpen(false)}
                    className="block px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors truncate"
                    title={item}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatCleanMoney(val: any): string | null {
  if (val == null || val === '') return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'null') return null;
    const matchSuffix = /[0-9.]+\s*([MBKTmbkt])/i.exec(trimmed);
    if (matchSuffix) {
      const numPart = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
      const suffix = matchSuffix[1].toUpperCase();
      if (!isNaN(numPart)) return `$${numPart}${suffix}`;
      return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
    }
    const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num) && num > 0) {
      if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}B`;
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
      return `$${num.toLocaleString()}`;
    }
    return trimmed;
  }
  if (typeof val === 'number') {
    if (val <= 0) return null;
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `$${val.toLocaleString()}`;
  }
  return String(val);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return <span className="text-zinc-600">—</span>;
  const formatted = formatEasternDateTime(dateStr);
  if (!formatted) return <span className="text-zinc-600">—</span>;
  return (
    <span title={formatted}>
      {formatted}
    </span>
  );
}

export default function LeadTable({ loading, selectedLeads, filteredLeads, onToggleSelection, onToggleAll, onOpenLead }: LeadTableProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <svg className="animate-spin h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (filteredLeads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm text-zinc-500">No leads found</p>
          <p className="text-xs text-zinc-600 mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const allSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.has(l.id));

  return (
    <div className="flex-1 overflow-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="w-10 px-4 py-3 text-left">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400" />
            </th>
            <th className="px-4 py-3 text-left table-header">Company Name</th>
            <th className="px-4 py-3 text-left table-header">Decision Maker</th>
            <th className="px-4 py-3 text-left table-header">Industry</th>
            <th className="px-4 py-3 text-left table-header">Phone</th>
            <th className="px-4 py-3 text-left table-header">Email</th>
            <th className="px-4 py-3 text-left table-header">Revenue</th>
            <th className="px-4 py-3 text-left table-header">Status</th>
            <th className="px-4 py-3 text-left table-header">Stage</th>
            <th className="px-4 py-3 text-left table-header">Score</th>
            <th className="px-4 py-3 text-left table-header">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/30">
          {filteredLeads.map((lead) => {
            const decisionMaker = lead.decision_maker || lead.company_people?.[0];
            return (
              <tr
                key={lead.id}
                className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
                onClick={() => onOpenLead(lead)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => onToggleSelection(lead.id)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-white">{lead.company_name}</p>
                    {lead.company_size && (
                      <span className="badge border-zinc-700/60 bg-zinc-800/60 text-zinc-400 text-[10px]">
                        {lead.company_size}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {decisionMaker ? (
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">{decisionMaker.full_name}</p>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">{decisionMaker.job_title || decisionMaker.headline || 'Executive'}</p>
                      {(decisionMaker.city || decisionMaker.state) && (
                        <p className="text-[10px] text-zinc-400 truncate max-w-[140px] flex items-center gap-1 mt-0.5" title={`Location: ${[decisionMaker.city, decisionMaker.state, decisionMaker.country].filter(Boolean).join(', ')}`}>
                          <span>📍</span>
                          <span>{[decisionMaker.city, decisionMaker.state].filter(Boolean).join(', ')}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">{lead.industry || <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                  <MultiContactCell value={lead.company_phone} type="phone" />
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                  <MultiContactCell 
                    value={
                      [decisionMaker?.email, decisionMaker?.personal_email, lead.company_email]
                        .filter(Boolean)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .join(', ') || undefined
                    } 
                    type="email" 
                  />
                </td>
                <td className="px-4 py-3 text-sm">
                  {(() => {
                    const cleanRev = formatCleanMoney(lead.company_annual_revenue_clean || lead.company_annual_revenue);
                    return cleanRev ? (
                      <span className="badge border-zinc-700/60 bg-zinc-800/60 text-zinc-300 text-[11px] font-medium">
                        {cleanRev}
                      </span>
                    ) : <span className="text-zinc-600">—</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="badge border-zinc-700 text-zinc-400">
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                    {lead.follow_up_date && lead.follow_up_status === 'scheduled' && (
                      <span className="text-[10px] text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/80 whitespace-nowrap">
                        📅 {lead.follow_up_date}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {lead.stage ? (
                    <span
                      title={lead.ai_reasoning || (lead.status === 'unqualified' ? `Failed at ${lead.stage.replace(/_/g, ' ')}` : undefined)}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize whitespace-nowrap border ${
                        lead.status === 'unqualified'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-800/40 font-medium'
                          : lead.stage === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700/40'
                      }`}
                    >
                      {lead.status === 'unqualified' ? `Failed: ${lead.stage.replace(/_/g, ' ')}` : lead.stage.replace(/_/g, ' ')}
                    </span>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {lead.score != null ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${lead.score >= 70 ? 'bg-zinc-200' : lead.score >= 40 ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
                      {lead.score}
                    </span>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

