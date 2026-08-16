'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface Campaign {
  id: number;
  campaign_id: string;
  name: string;
  description: string;
  niche: string;
  location: string;
  lead_count: number | null;
  total_leads_found?: number;
  results_count?: number;
  is_crm_synced?: number;
  crawled_count?: number;
  llm_processed_count?: number;
  apollo_processed_count?: number;
  linkedin_processed_count?: number;
  insights_processed_count?: number;
  status: string;
  stage?: string;
  apify_task_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CampaignResult {
  id: number;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number | null;
  review_count: number | null;
  category: string;
  is_crm_synced: boolean;
}

interface CampaignLog {
  message: string;
  level: string;
  created_at: string;
}

interface CampaignDetailsProps {
  campaign: Campaign | null;
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  onCampaignUpdated?: () => void;
  onCampaignDeleted?: () => void;
  onEditCampaign?: (campaign: Campaign) => void;
}

const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function CampaignDetails({ campaign: init, isOpen, onClose, embedded = false, onCampaignUpdated, onCampaignDeleted, onEditCampaign }: CampaignDetailsProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(init);
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [viewMode, setViewMode] = useState<'details' | 'logs'>('details');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCampaign(init); }, [init]);

  // Keep a ref to current campaign so SSE handlers always read the latest value
  // without needing to be re-registered on every state change (stale closure fix)
  const campaignRef = useRef(campaign);
  useEffect(() => { campaignRef.current = campaign; }, [campaign]);

  useEffect(() => {
    if ((embedded || isOpen) && campaign) {
      fetchResults(campaign.id);
      fetchLogs(campaign.id);
    }
  }, [isOpen, campaign?.id, embedded]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const handleCampaignCompleted = (e: any) => {
      const completedCampaign = e.detail;
      const cur = campaignRef.current;
      if (cur && completedCampaign && (completedCampaign.id === cur.id || completedCampaign.campaign_id === cur.campaign_id)) {
        setCampaign(prev => prev ? { 
          ...prev, 
          status: completedCampaign.status, 
          stage: completedCampaign.stage,
          crawled_count: completedCampaign.crawled_count ?? prev.crawled_count,
          llm_processed_count: completedCampaign.llm_processed_count ?? prev.llm_processed_count,
          apollo_processed_count: completedCampaign.apollo_processed_count ?? prev.apollo_processed_count,
          linkedin_processed_count: completedCampaign.linkedin_processed_count ?? prev.linkedin_processed_count,
          insights_processed_count: completedCampaign.insights_processed_count ?? prev.insights_processed_count,
        } : prev);
        fetchResults(cur.id);
        onCampaignUpdated?.();
      }
    };
    const handleCampaignProgress = (e: any) => {
      const p = e.detail;
      const cur = campaignRef.current;
      if (cur && p && (p.id === cur.id || p.campaign_id === cur.campaign_id)) {
        setCampaign(prev => prev ? { 
          ...prev, 
          status: p.status, 
          stage: p.stage,
          total_leads_found: p.total_leads_found,
          results_count: p.results_count,
          is_crm_synced: p.is_crm_synced,
          crawled_count: p.crawled_count,
          llm_processed_count: p.llm_processed_count,
          apollo_processed_count: p.apollo_processed_count,
          linkedin_processed_count: p.linkedin_processed_count,
          insights_processed_count: p.insights_processed_count
        } : prev);
      }
    };
    const handleCampaignLog = (e: any) => {
      const p = e.detail;
      const cur = campaignRef.current;
      if (cur && p && (p.id === cur.id || p.campaign_id === cur.campaign_id) && p.log) {
        setLogs(prev => [...prev, p.log]);
      }
    };

    window.addEventListener('campaign-completed', handleCampaignCompleted);
    window.addEventListener('campaign-progress', handleCampaignProgress);
    window.addEventListener('campaign-log', handleCampaignLog);
    return () => {
      window.removeEventListener('campaign-completed', handleCampaignCompleted);
      window.removeEventListener('campaign-progress', handleCampaignProgress);
      window.removeEventListener('campaign-log', handleCampaignLog);
    };
  // Register only once on mount - campaignRef always has fresh value via the ref sync above
  }, []);

  useEffect(() => {
    if (viewMode === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode]);

  const fetchResults = async (id: number) => {
    try { 
      const [res, campRes] = await Promise.all([
        axios.get(`/api/lead-hunter/campaigns/${id}/results/`),
        axios.get(`/api/lead-hunter/campaigns/${id}/`)
      ]);
      setResults(res.data.results || []); 
      setCampaign(prev => prev ? { ...prev, ...campRes.data } : campRes.data);
    }
    catch (e) { console.error(e); }
  };

  const fetchLogs = async (id: number) => {
    try { const { data } = await axios.get(`/api/lead-hunter/campaigns/${id}/logs/`); setLogs(data || []); }
    catch (e) { console.error(e); }
  };

  const handleRefresh = () => {
    if (campaign) {
      fetchResults(campaign.id);
      fetchLogs(campaign.id);
    }
  };

  const runCampaign = async () => {
    if (!campaign) return;
    try {
      await axios.post(`/api/lead-hunter/campaigns/${campaign.id}/run/`);
      onCampaignUpdated?.();
      
      // Fallback poll: queries LOCAL database details endpoint only (extremely lightweight, doesn't hit Apify)
      const poll = setInterval(async () => {
        try {
          const r = await axios.get(`/api/lead-hunter/campaigns/${campaign.id}/`);
          if (r.data.status) {
            setCampaign(prev => prev ? { ...prev, status: r.data.status, stage: r.data.stage, apify_task_id: r.data.apify_task_id || prev.apify_task_id } : prev);
            if (r.data.status !== 'running') {
              clearInterval(poll);
              onCampaignUpdated?.();
              fetchResults(campaign.id);
            }
          }
        } catch (e) {
          console.error('Local fallback poll error:', e);
          clearInterval(poll);
        }
      }, 8000);
    } catch (e) { console.error(e); }
  };


  const confirmDelete = async () => {
    if (!campaign) return;
    setDeleting(true);
    try { await axios.delete(`/api/lead-hunter/campaigns/${campaign.id}/`); setShowDelete(false); onCampaignDeleted?.(); }
    catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  if (!campaign) return null;

  const resultCount = results.length;
  const syncedCount = results.filter(r => r.is_crm_synced).length;

  const body = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between flex-none">
        <div className="flex items-center gap-3 min-w-0">
          {viewMode === 'logs' && (
            <button onClick={() => setViewMode('details')} className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors flex-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
          <h3 className="text-base font-semibold text-white truncate">{campaign.name}</h3>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md flex-none">{campaign.campaign_id}</span>
          <span className="badge border-zinc-700 text-zinc-400 flex-none">{campaign.status}</span>
          {campaign.stage && campaign.status !== 'pending' && campaign.status !== 'completed' && (
            <span className="badge border-primary-700 bg-primary-500/10 text-primary-400 flex-none capitalize">
              {campaign.stage.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-none">
          {(campaign.status === 'pending' || campaign.status === 'failed') && (
            <button onClick={runCampaign} className="btn-primary text-xs px-3 py-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Run
            </button>
          )}
          <button onClick={handleRefresh} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150" title="Refresh">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-lg shadow-card py-1 z-50">
                <button onClick={() => { setMenuOpen(false); setViewMode(viewMode === 'details' ? 'logs' : 'details'); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  {viewMode === 'details' ? 'View logs' : 'View details'}
                </button>
                <button onClick={() => { setMenuOpen(false); onEditCampaign?.(campaign); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-t border-zinc-800 mt-0.5">
                  Edit campaign
                </button>
                <button onClick={() => { setMenuOpen(false); setShowDelete(true); }} className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:text-rose-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800 mt-0.5">
                  Delete campaign
                </button>
              </div>
            )}
          </div>
          {!embedded && onClose && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'details' ? (
        <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">Campaign Parameters</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Niche</p>
              <p className="text-sm text-zinc-200 mt-1">{campaign.niche || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Location</p>
              <p className="text-sm text-zinc-200 mt-1">{campaign.location || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Target</p>
              <p className="text-sm text-zinc-200 mt-1">{campaign.lead_count ?? 'Unlimited'}</p>
            </div>
          </div>
          
          {campaign.description && (
            <div className="mt-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{campaign.description}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-5 border-b border-zinc-800">
          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">Pipeline Execution Stats</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Leads Found', value: campaign.total_leads_found || 0, desc: 'Apify search result' },
              { label: 'Scraped', value: campaign.results_count !== undefined ? campaign.results_count : resultCount, desc: 'Google Maps profiles' },
              { label: 'Crawled', value: campaign.crawled_count || 0, desc: 'Websites scanned' },
              { label: 'LLM Processed', value: campaign.llm_processed_count || 0, desc: 'Basic qualification' },
              { label: 'Apollo Enriched', value: campaign.apollo_processed_count || 0, desc: 'B2B contacts added' },
              { label: 'LinkedIn Scraped', value: campaign.linkedin_processed_count || 0, desc: 'Social footprint' },
              { label: 'AI Insights', value: campaign.insights_processed_count || 0, desc: 'Deep research' },
              { label: 'Email Templates', value: campaign.insights_processed_count || 0, desc: 'Drafts generated' },
              { label: 'Synced to CRM', value: campaign.is_crm_synced !== undefined ? campaign.is_crm_synced : syncedCount, desc: 'All Qual & Unqual leads' },
            ].map((item) => (
              <div key={item.label} className="bg-zinc-800/30 rounded-lg p-3.5 border border-zinc-800/50">
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{item.label}</p>
                <div className="mt-1.5">
                  <span className="text-lg font-bold text-white tabular-nums">{item.value?.toString()}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {campaign.apify_task_id && (
            <a href={`https://console.apify.com/actors/runs/${campaign.apify_task_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 mt-5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Apify Logs
            </a>
          )}
        </div>

        <div className="px-5 py-4 mt-auto border-t border-zinc-800/50">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Created: {fmt(campaign.created_at)}</span>
            <span>Updated: {fmt(campaign.updated_at)}</span>
          </div>
        </div>
      </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-black p-5 font-mono text-xs flex flex-col gap-1.5">
          {logs.length === 0 ? (
            <p className="text-zinc-600 italic">No logs available for this campaign yet.</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-3 leading-relaxed">
                <span className="text-zinc-600 flex-none w-32">[{new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className={`flex-1 ${log.level === 'error' ? 'text-rose-400' : log.level === 'success' ? 'text-emerald-400' : log.level === 'warning' ? 'text-amber-400' : 'text-zinc-300'}`}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal p-6 w-96">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-800/30 flex items-center justify-center flex-none">
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete campaign</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mt-4 mb-5">Delete "<span className="text-zinc-300">{campaign.name}</span>"? All scraped results will be permanently removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDelete(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="btn-primary text-sm bg-rose-500 hover:bg-rose-600">
                {deleting ? 'Deleting...' : 'Delete campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!embedded) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
          {body}
        </div>
      </div>
    );
  }

  return body;
}
