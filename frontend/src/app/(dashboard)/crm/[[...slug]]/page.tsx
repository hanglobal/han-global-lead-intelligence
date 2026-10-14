'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import CRMDashboard from '@/app/(dashboard)/crm/components/CRMDashboard';
import FilterTab from '@/app/(dashboard)/crm/components/FilterTab';
import LeadTable from '@/app/(dashboard)/crm/components/LeadTable';
import LeadView from '@/app/(dashboard)/crm/components/LeadView';
import CRMExportModal from '@/app/(dashboard)/crm/components/CRMExportModal';
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
  place_id?: string;
  company_name: string;
  industry?: string;
  company_domain?: string;
  company_website?: string;
  company_phone?: string;
  company_email?: string;
  company_linkedin?: string;
  company_size?: string;
  company_annual_revenue?: string;
  company_annual_revenue_clean?: string;
  company_total_funding?: string;
  company_total_funding_clean?: string;
  company_technologies?: string[];
  keywords?: string;
  company_description?: string;
  city?: string;
  state?: string;
  country?: string;
  company_street_address?: string;
  company_postal_code?: string;
  company_full_address?: string;
  google_maps_url?: string;
  rating?: number;
  review_count?: number;
  status: string;
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
  youtube_url?: string;
  social_links?: Record<string, string>;
  crm_signals?: Record<string, any>;
  raw_data?: Record<string, any>;
  decision_maker?: DecisionMaker | null;
  company_people?: DecisionMaker[];
  created_at?: string;
  updated_at?: string;
  follow_up_date?: string | null;
  follow_up_time?: string | null;
  follow_up_status?: string | null;
  follow_up_action_type?: string | null;
  follow_up_priority?: string | null;
  follow_up_notes?: string | null;
  last_contacted_at?: string | null;
  company_summary?: string;
  ai_reasoning?: string | null;
  sales_brief?: string;
  why_now?: string;
  recommended_service?: string;
  effective_email?: string;
  insight?: {
    pain_points: string;
    operational_gap: string;
    opportunity: string;
  } | null;
  email_drafts?: {
    subject: string;
    body: string;
  }[];
  linkedin_profile?: any;
  linkedin_posts?: any[];
  working_hours?: string | null;
  neighborhood?: string | null;
  firecrawl_raw_data?: any;
  notes_history?: {
    id: number;
    note: string;
    created_by: string;
    created_at: string;
  }[];
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
    const handleCampaignCompleted = () => {
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

  const [totalLeadCount, setTotalLeadCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const PAGE_SIZE = 100;

      // Load first page immediately for fast initial render
      const firstPage = await axios.get('/api/crm/leads/?page=1&page_size=' + PAGE_SIZE);
      const firstData = firstPage.data;
      setLeads(firstData.results || firstData);
      const total = firstData.count ?? (firstData.results ? firstData.count : firstData.length);
      setTotalLeadCount(total);
      setLoading(false);

      // Load remaining pages in the background
      const totalPages = Math.ceil(total / PAGE_SIZE);
      if (totalPages > 1) {
        setLoadingMore(true);
        const allLeads = [...(firstData.results || firstData)];
        for (let page = 2; page <= totalPages; page++) {
          const r = await axios.get(`/api/crm/leads/?page=${page}&page_size=${PAGE_SIZE}`);
          const pageData = r.data;
          allLeads.push(...(pageData.results || pageData));
          setLeads([...allLeads]); // Progressive render
        }
        setLoadingMore(false);
      }
    } catch (e: any) {
      console.error(e.message);
      setLoading(false);
      setLoadingMore(false);
    }
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

  const categories: string[] = Array.from(new Set(leads.map(l => l.industry).filter((x): x is string => typeof x === 'string' && x.length > 0)));
  const availableCampaigns = Array.from(new Set(leads.map(l => l.campaign_id).filter((c): c is string => !!c))).sort();

  const filteredLeads = leads.filter(lead => {
    const s = searchTerm.toLowerCase();
    const dm = lead.decision_maker || lead.company_people?.[0];
    const searchString = `${lead.company_name} ${dm?.full_name || ''} ${lead.industry || ''} ${lead.company_phone || ''} ${lead.company_email || ''} ${lead.lid || ''} ${JSON.stringify(lead.raw_data || {})} ${JSON.stringify(lead.crm_signals || {})}`.toLowerCase();
    const matchSearch = !searchTerm || searchString.includes(s);
    
    const matchStatus = statusFilter.size === 0 || statusFilter.has(lead.status);
    const matchRating = (ratingMin === '' || (lead.rating ?? 0) >= ratingMin) && (ratingMax === '' || (lead.rating ?? 0) <= ratingMax);
    const matchReview = (reviewMin === '' || (lead.review_count ?? 0) >= reviewMin) && (reviewMax === '' || (lead.review_count ?? 0) <= reviewMax);
    const matchCat = categoryFilter.size === 0 || (lead.industry && categoryFilter.has(lead.industry));
    const matchCampaign = campaignFilter.size === 0 || (lead.campaign_id && campaignFilter.has(lead.campaign_id));
    const matchLeadId = leadIdFilter.size === 0 || (lead.lid && leadIdFilter.has(lead.lid));
    
    const hasAnyEmail = !!lead.company_email || 
      !!lead.crm_signals?.decision_maker_email || 
      !!lead.crm_signals?.personal_email ||
      !!dm?.email ||
      !!dm?.personal_email ||
      (lead.raw_data?.emails && lead.raw_data.emails.length > 0) ||
      (lead.raw_data?.decision_makers && lead.raw_data.decision_makers.some((d: any) => d.email));
    
    const matchEmail = !hasEmail || hasAnyEmail;
    
    const matchPhone = !hasPhone || !!lead.company_phone || !!dm?.mobile_number;
    const matchScore = (scoreMin === '' || (lead.score ?? 0) >= scoreMin) && (scoreMax === '' || (lead.score ?? 0) <= scoreMax);

    const matchDate = (() => {
      if (!dateFrom && !dateTo) return true;
      if (!lead.created_at) return false;
      const leadTime = new Date(lead.created_at).getTime();
      if (isNaN(leadTime)) return true;
      if (dateFrom) {
        const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
        if (leadTime < fromTime) return false;
      }
      if (dateTo) {
        const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
        if (leadTime > toTime) return false;
      }
      return true;
    })();
    
    return matchSearch && matchStatus && matchRating && matchReview && matchCat && matchCampaign && matchLeadId && matchEmail && matchPhone && matchScore && matchDate;
  });

  const toggleStatus = (s: string) => { const n = new Set(statusFilter); n.has(s) ? n.delete(s) : n.add(s); setStatusFilter(n); };
  const toggleCategory = (c: string) => { const n = new Set(categoryFilter); n.has(c) ? n.delete(c) : n.add(c); setCategoryFilter(n); };
  const toggleCampaign = (c: string) => { const n = new Set(campaignFilter); n.has(c) ? n.delete(c) : n.add(c); setCampaignFilter(n); };
  const toggleLeadId = (lid: string) => { const n = new Set(leadIdFilter); n.has(lid) ? n.delete(lid) : n.add(lid); setLeadIdFilter(n); };
  const clearAllFilters = () => { 
    setStatusFilter(new Set()); 
    setRatingMin(''); 
    setRatingMax(''); 
    setReviewMin(''); 
    setReviewMax(''); 
    setCategoryFilter(new Set()); 
    setCampaignFilter(new Set()); 
    setLeadIdFilter(new Set()); 
    setHasEmail(false); 
    setHasPhone(false); 
    setScoreMin(''); 
    setScoreMax(''); 
    setDateFrom('');
    setDateTo('');
  };
  const hasActiveFilters = statusFilter.size > 0 || ratingMin !== '' || ratingMax !== '' || reviewMin !== '' || reviewMax !== '' || categoryFilter.size > 0 || campaignFilter.size > 0 || leadIdFilter.size > 0 || hasEmail || hasPhone || scoreMin !== '' || scoreMax !== '' || !!dateFrom || !!dateTo;
  const activeFilterCount = (statusFilter.size > 0 ? 1 : 0) + (ratingMin !== '' || ratingMax !== '' ? 1 : 0) + (reviewMin !== '' || reviewMax !== '' ? 1 : 0) + (categoryFilter.size > 0 ? 1 : 0) + (campaignFilter.size > 0 ? 1 : 0) + (leadIdFilter.size > 0 ? 1 : 0) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (scoreMin !== '' || scoreMax !== '' ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const toggleLeadSelection = (id: number) => { const n = new Set(selectedLeads); n.has(id) ? n.delete(id) : n.add(id); setSelectedLeads(n); };
  const toggleAllSelection = () => setSelectedLeads(selectedLeads.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map(l => l.id)));

  const leadsToExport = selectedLeads.size > 0 ? filteredLeads.filter(l => selectedLeads.has(l.id)) : filteredLeads;

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
          campaigns={availableCampaigns}
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
          dateFrom={dateFrom}
          dateTo={dateTo}
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
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
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

              <span className="text-xs text-zinc-600 ml-1">
                {filteredLeads.length} leads
                {loadingMore && (
                  <span className="text-zinc-600 ml-1 animate-pulse">
                    · loading {totalLeadCount - leads.length} more…
                  </span>
                )}
              </span>

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

      <CRMExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedCount={selectedLeads.size}
        totalFilteredCount={filteredLeads.length}
        leadsToExport={leadsToExport}
      />
    </div>
  );
}
