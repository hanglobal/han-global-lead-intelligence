'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatEasternDateTime } from '@/lib/dateUtils';

interface Campaign {
  id: number;
  campaign_id: string;
  name: string;
  description: string;
  niche: string;
  location: string;
  lead_count: number | null;
  total_leads_found: number;
  status: string;
  stage?: string;
  actor_type?: string;
  nexus_campaign_id?: string | null;
  filters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CampaignListProps {
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign?: () => void;
  refreshTrigger: number;
  selectedId: number | null;
}

const fmt = (d: string) => formatEasternDateTime(d);

export default function CampaignList({ onSelectCampaign, onCreateCampaign, refreshTrigger, selectedId }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCampaigns(); }, [refreshTrigger]);

  const fetchCampaigns = async () => {
    try { const r = await axios.get('/api/lead-hunter/campaigns/'); setCampaigns(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between flex-none">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-white">Campaigns</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">{campaigns.length}</span>
        </div>
        <button
          onClick={onCreateCampaign}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150"
          title="New campaign"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">No campaigns yet</p>
            <p className="text-xs text-zinc-600 mt-1.5">Click + to create one</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1.5">
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCampaign(c)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-150 ${
                  selectedId === c.id
                    ? 'bg-zinc-800 border border-zinc-700'
                    : 'hover:bg-zinc-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${selectedId === c.id ? 'text-white' : 'text-zinc-200'}`}>{c.name}</p>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">{c.campaign_id}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{fmt(c.created_at)}</p>
                  </div>
                  <div className="flex-none pt-0.5">
                    <span className="badge border-zinc-700 text-zinc-400 capitalize">{c.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
