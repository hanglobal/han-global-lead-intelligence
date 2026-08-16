'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import CRMDashboard from '@/components/crm/CRMDashboard';
import FilterTab from '@/components/crm/FilterTab';
import LeadTable from '@/components/crm/LeadTable';
import LeadView from '@/components/crm/LeadView';

interface Lead {
  id: number;
  lid?: string;
  place_id?: string;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  status: string;
  company_phone: string;
  phone_unformatted?: string;
  company_email?: string;
  address?: string;
  street_address?: string;
  neighborhood?: string;
  city?: string;
  postal_code?: string;
  website?: string;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  price_level?: string | null;
  fid?: string;
  scraped_at?: string;
  source?: string;
  notes?: string;
  tags?: string[];
  campaign_id?: string;
  source_campaign_id?: number | null;
  score?: number | null;
  score_label?: 'hot' | 'warm' | 'cold' | null;
  score_reasons?: string[];
  stage?: string | null;
  classification?: string | null;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  social_links?: Record<string, string>;
  crm_signals?: Record<string, any>;
  raw_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export default function CRMPage() {
  const params = useParams();
  const slug = params?.slug as string[] | undefined;
  const lidFromUrl = slug?.[0] || null;

  const [searchActive, setSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [ratingMin, setRatingMin] = useState<number | ''>('');
  const [ratingMax, setRatingMax] = useState<number | ''>('');
  const [reviewMin, setReviewMin] = useState<number | ''>('');
  const [reviewMax, setReviewMax] = useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [campaignFilter, setCampaignFilter] = useState<Set<string>>(new Set());
  const [leadIdFilter, setLeadIdFilter] = useState<Set<string>>(new Set());
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [scoreMin, setScoreMin] = useState<number | ''>('');
  const [scoreMax, setScoreMax] = useState<number | ''>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, new: 0, qualified: 0, unqualified: 0 });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => { fetchLeads(); fetchStats(); }, []);

  useEffect(() => {
    const handleCampaignCompleted = (e: any) => {
      console.log("SSE Campaign Completed - refreshing CRM data:", e.detail);
      fetchLeads();
      fetchStats();
    };
    window.addEventListener('campaign-completed', handleCampaignCompleted);
    return () => {
      window.removeEventListener('campaign-completed', handleCampaignCompleted);
    };
  }, []);

  useEffect(() => {
    if (lidFromUrl && leads.length > 0 && !loading) {
      const lead = leads.find(l => l.lid === lidFromUrl);
      if (lead) {
        setSelectedLead(lead);
        setShowLeadModal(true);
      }
    }
  }, [lidFromUrl, leads, loading]);


  const handleBrowserNav = useCallback(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/crm\/(.+)$/);
    if (match) {
      const lid = match[1];
      const lead = leads.find(l => l.lid === lid);
      if (lead) {
        setSelectedLead(lead);
        setShowLeadModal(true);
      } else if (leads.length > 0) {
        setShowLeadModal(false);
        setSelectedLead(null);
      }
    } else {
      setShowLeadModal(false);
      setSelectedLead(null);
    }
  }, [leads]);

  useEffect(() => {
    window.addEventListener('popstate', handleBrowserNav);
    return () => window.removeEventListener('popstate', handleBrowserNav);
  }, [handleBrowserNav]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchLeads = async () => {
    try { const r = await axios.get('/api/crm/leads/'); setLeads(r.data); }
    catch (e: any) { console.error(e.message); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const r = await axios.get('/api/crm/stats/');
      const d = r.data;
      setStats({
        total: d.total,
        new: d.by_status?.new || 0,
        qualified: d.by_status?.qualified || 0,
        unqualified: d.by_status?.unqualified || 0,
      });
    } catch (e) { console.error(e); }
  };

  const handleBulkScore = async () => {
    setScoring(true);
    try {
      const r = await axios.post('/api/crm/leads/bulk-score/');
      await fetchLeads();
      if (r.data.remaining > 0) setTimeout(() => handleBulkScore(), 1000);
    } catch (e) { console.error(e); }
    finally { setScoring(false); }
  };

  const categories = Array.from(new Set(leads.map(l => l.category).filter(Boolean)));

  const filteredLeads = leads.filter(lead => {
    const s = searchTerm.toLowerCase();
    const searchString = `${lead.name} ${lead.company_phone || ''} ${lead.company_email || ''} ${lead.lid || ''} ${JSON.stringify(lead.raw_data || {})} ${JSON.stringify(lead.crm_signals || {})}`.toLowerCase();
    const matchSearch = !searchTerm || searchString.includes(s);
    
    const matchStatus = statusFilter.size === 0 || statusFilter.has(lead.status);
    const matchRating = (ratingMin === '' || (lead.rating ?? 0) >= ratingMin) && (ratingMax === '' || (lead.rating ?? 0) <= ratingMax);
    const matchReview = (reviewMin === '' || (lead.review_count ?? 0) >= reviewMin) && (reviewMax === '' || (lead.review_count ?? 0) <= reviewMax);
    const matchCat = categoryFilter.size === 0 || (lead.category && categoryFilter.has(lead.category));
    const matchCampaign = campaignFilter.size === 0 || (lead.campaign_id && campaignFilter.has(lead.campaign_id));
    const matchLeadId = leadIdFilter.size === 0 || (lead.lid && leadIdFilter.has(lead.lid));
    
    const hasAnyEmail = !!lead.company_email || 
      !!lead.crm_signals?.decision_maker_email || 
      !!lead.crm_signals?.personal_email ||
      (lead.raw_data?.emails && lead.raw_data.emails.length > 0) ||
      (lead.raw_data?.decision_makers && lead.raw_data.decision_makers.some((dm: any) => dm.email));
    
    const matchEmail = !hasEmail || hasAnyEmail;
    
    const matchPhone = !hasPhone || !!lead.company_phone;
    const matchScore = (scoreMin === '' || (lead.score ?? 0) >= scoreMin) && (scoreMax === '' || (lead.score ?? 0) <= scoreMax);
    
    return matchSearch && matchStatus && matchRating && matchReview && matchCat && matchCampaign && matchLeadId && matchEmail && matchPhone && matchScore;
  });

  const toggleStatus = (s: string) => { const n = new Set(statusFilter); n.has(s) ? n.delete(s) : n.add(s); setStatusFilter(n); };
  const toggleCategory = (c: string) => { const n = new Set(categoryFilter); n.has(c) ? n.delete(c) : n.add(c); setCategoryFilter(n); };
  const toggleCampaign = (c: string) => { const n = new Set(campaignFilter); n.has(c) ? n.delete(c) : n.add(c); setCampaignFilter(n); };
  const toggleLeadId = (lid: string) => { const n = new Set(leadIdFilter); n.has(lid) ? n.delete(lid) : n.add(lid); setLeadIdFilter(n); };
  const clearAllFilters = () => { setStatusFilter(new Set()); setRatingMin(''); setRatingMax(''); setReviewMin(''); setReviewMax(''); setCategoryFilter(new Set()); setCampaignFilter(new Set()); setLeadIdFilter(new Set()); setHasEmail(false); setHasPhone(false); setScoreMin(''); setScoreMax(''); };
  const hasActiveFilters = statusFilter.size > 0 || ratingMin !== '' || ratingMax !== '' || reviewMin !== '' || reviewMax !== '' || categoryFilter.size > 0 || campaignFilter.size > 0 || leadIdFilter.size > 0 || hasEmail || hasPhone || scoreMin !== '' || scoreMax !== '';
  const activeFilterCount = (statusFilter.size > 0 ? 1 : 0) + (ratingMin !== '' || ratingMax !== '' ? 1 : 0) + (reviewMin !== '' || reviewMax !== '' ? 1 : 0) + (categoryFilter.size > 0 ? 1 : 0) + (campaignFilter.size > 0 ? 1 : 0) + (leadIdFilter.size > 0 ? 1 : 0) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (scoreMin !== '' || scoreMax !== '' ? 1 : 0);
  const toggleLeadSelection = (id: number) => { const n = new Set(selectedLeads); n.has(id) ? n.delete(id) : n.add(id); setSelectedLeads(n); };
  const toggleAllSelection = () => setSelectedLeads(selectedLeads.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map(l => l.id)));

  const handleExportCSV = () => {
    const leadsToExport = selectedLeads.size > 0 ? filteredLeads.filter(l => selectedLeads.has(l.id)) : filteredLeads;
    const headers = [
      'id', 'lid', 'name', 'category', 'status', 'stage', 'score', 'score_label', 
      'company_phone', 'company_email', 'address', 'website', 'google_maps_url',
      'rating', 'review_count', 'campaign_id', 'source_campaign_id',
      'facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url',
      'crm_signals', 'raw_data', 'created_at'
    ];
    const rows = leadsToExport.map(l => {
      return headers.map(h => {
        const val = (l as any)[h];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    a.download = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}.csv`;
    
    a.click();
    setShowExportModal(false);
  };

  const handleExportJSON = () => {
    const leadsToExport = selectedLeads.size > 0 ? filteredLeads.filter(l => selectedLeads.has(l.id)) : filteredLeads;
    const jsonStr = JSON.stringify(leadsToExport, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json' }));
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    a.download = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}.json`;
    
    a.click();
    setShowExportModal(false);
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedLeads);
    setDeleting(true); setShowDeleteDialog(false);
    await Promise.allSettled(ids.map(id => axios.delete(`/api/crm/leads/${id}/`)));
    await fetchLeads(); await fetchStats();
    setSelectedLeads(new Set()); setDeleting(false);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <CRMDashboard stats={stats} />

      <div className="flex-1 flex gap-2.5 min-h-0">
        <FilterTab
          isOpen={filterOpen}
          categories={categories}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          campaignFilter={campaignFilter}
          leadIdFilter={leadIdFilter}
          ratingMin={ratingMin}
          ratingMax={ratingMax}
          reviewMin={reviewMin}
          reviewMax={reviewMax}
          hasEmail={hasEmail}
          hasPhone={hasPhone}
          scoreMin={scoreMin}
          scoreMax={scoreMax}
          hasActiveFilters={hasActiveFilters}
          onToggleStatus={toggleStatus}
          onToggleCategory={toggleCategory}
          onToggleCampaign={toggleCampaign}
          onToggleLeadId={toggleLeadId}
          onRatingMinChange={setRatingMin}
          onRatingMaxChange={setRatingMax}
          onReviewMinChange={setReviewMin}
          onReviewMaxChange={setReviewMax}
          onHasEmailChange={setHasEmail}
          onHasPhoneChange={setHasPhone}
          onScoreMinChange={setScoreMin}
          onScoreMaxChange={setScoreMax}
          onClearAll={clearAllFilters}
        />

        <div className="flex-1 card overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-none">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`btn-ghost text-xs ${filterOpen ? 'bg-zinc-800 text-white' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>

              <span className="text-xs text-zinc-600 ml-1">{filteredLeads.length} leads</span>

              {searchActive ? (
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-48 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all duration-150"
                  />
                  <button onClick={() => { setSearchActive(false); setSearchTerm(''); }} className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => setSearchActive(true)} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {selectedLeads.size > 0 && (
                <span className="text-xs text-zinc-500 mr-2">{selectedLeads.size} selected</span>
              )}

              <button
                onClick={handleBulkScore}
                disabled={scoring}
                title="Score all leads"
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 ${scoring ? 'text-amber-400 bg-amber-500/10 cursor-wait' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
              >
                {scoring ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-lg shadow-card py-1 z-50">
                    <button onClick={() => { setShowExportModal(true); setMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                      Export leads
                    </button>
                    {selectedLeads.size > 0 && (
                      <button onClick={() => { setShowDeleteDialog(true); setMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:text-rose-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800 mt-0.5">
                        Delete selected
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <LeadTable
            loading={loading}
            selectedLeads={selectedLeads}
            filteredLeads={filteredLeads}
            onToggleSelection={toggleLeadSelection}
            onToggleAll={toggleAllSelection}
            onOpenLead={(lead) => { setSelectedLead(lead); setShowLeadModal(true); window.history.pushState({ leadId: lead.id }, '', `/crm/${lead.lid}`); }}
          />
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal p-6 w-96">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-800/30 flex items-center justify-center flex-none">
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete leads</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mt-4 mb-5">
              {selectedLeads.size === 1 ? 'Delete this lead?' : `Delete ${selectedLeads.size} leads?`}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteDialog(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn-primary text-sm bg-rose-500 hover:bg-rose-600">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LeadView lead={selectedLead} isOpen={showLeadModal} onClose={() => { setShowLeadModal(false); setSelectedLead(null); window.history.pushState({}, '', '/crm'); }} />

      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal w-96 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Export Leads</h3>
                <p className="text-xs text-zinc-400 mt-1">Exporting {selectedLeads.size > 0 ? `${selectedLeads.size} selected leads` : `${filteredLeads.length} filtered leads`}</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-1 rounded-md transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <button onClick={handleExportCSV} className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-left group">
                <div className="w-10 h-10 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-none group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 7.5l8.625 4.5m0 0l8.625-4.5M12 12v9" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 7.5L12 3l8.625 4.5M3.375 7.5v9l8.625 4.5m8.625-4.5v-9" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Export as CSV</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Spreadsheet format for Excel</p>
                </div>
              </button>
              
              <button onClick={handleExportJSON} className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-left group">
                <div className="w-10 h-10 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center flex-none group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Export as JSON</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Raw data format with all AI info</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
