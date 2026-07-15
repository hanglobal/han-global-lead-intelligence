'use client';
import { useState } from 'react';

interface Lead {
  id: number;
  lid?: string;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  status: string;
  company_phone: string;
  company_email?: string;
  address?: string;
  score?: number | null;
  score_label?: 'hot' | 'warm' | 'cold' | null;
  stage?: string | null;
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
  new: 'New', qualified: 'Qualified', unqualified: 'Unqualified'
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
      <a href={getHref(firstItem)} className="hover:text-primary-400 transition-colors truncate max-w-[150px] inline-block align-bottom" title={firstItem}>
        {firstItem}
      </a>
      {remainingCount > 0 && (
        <div className="relative">
          <button 
            onClick={() => setOpen(!open)}
            title={`View ${remainingCount} more`}
            className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full leading-none px-1 shadow-sm transition-colors cursor-pointer z-10"
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
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-primary-500" />
            </th>
            <th className="px-4 py-3 text-left table-header">Name</th>
            <th className="px-4 py-3 text-left table-header">Category</th>
            <th className="px-4 py-3 text-left table-header">Phone</th>
            <th className="px-4 py-3 text-left table-header">Email</th>
            <th className="px-4 py-3 text-left table-header">Rating</th>
            <th className="px-4 py-3 text-left table-header">Status</th>
            <th className="px-4 py-3 text-left table-header">Stage</th>
            <th className="px-4 py-3 text-left table-header">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/30">
          {filteredLeads.map((lead) => (
            <tr
              key={lead.id}
              className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
              onClick={() => onOpenLead(lead)}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => onToggleSelection(lead.id)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-primary-500" />
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-white">{lead.name}</p>
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">{lead.category || <span className="text-zinc-600">—</span>}</td>
              <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                <MultiContactCell value={lead.company_phone} type="phone" />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                <MultiContactCell value={lead.company_email} type="email" />
              </td>
              <td className="px-4 py-3 text-sm">
                {lead.rating ? (
                  <span className="text-zinc-400">{lead.rating} <span className="text-zinc-600">★</span> <span className="text-zinc-600">({lead.review_count})</span></span>
                ) : <span className="text-zinc-600">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className="badge border-zinc-700 text-zinc-400">
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {lead.stage ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 capitalize whitespace-nowrap">
                    {lead.stage.replace(/_/g, ' ')}
                  </span>
                ) : <span className="text-zinc-600">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {lead.score != null ? lead.score : <span className="text-zinc-600">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
