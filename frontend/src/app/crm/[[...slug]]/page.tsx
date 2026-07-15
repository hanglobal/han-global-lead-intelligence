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
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, new: 0, qualified: 0, unqualified: 0 });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<{ total: number; batch_duplicates: number; crm_duplicates: number; unique_to_import: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const sources = Array.from(new Set(leads.map(l => l.source).filter((s): s is string => !!s)));

  const filteredLeads = leads.filter(lead => {
    const matchSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter.size === 0 || statusFilter.has(lead.status);
    const matchRating = (!ratingMin || (lead.rating || 0) >= ratingMin) && (!ratingMax || (lead.rating || 0) <= ratingMax);
    const matchReview = (!reviewMin || (lead.review_count || 0) >= reviewMin) && (!reviewMax || (lead.review_count || 0) <= reviewMax);
    const matchCat = categoryFilter.size === 0 || (lead.category && categoryFilter.has(lead.category));
    const matchCampaign = campaignFilter.size === 0 || (lead.campaign_id && campaignFilter.has(lead.campaign_id));
    const matchLeadId = leadIdFilter.size === 0 || (lead.lid && leadIdFilter.has(lead.lid));
    const matchEmail = !hasEmail || !!lead.company_email;
    const matchPhone = !hasPhone || !!lead.company_phone;
    const matchScore = (!scoreMin || (lead.score ?? 0) >= scoreMin) && (!scoreMax || (lead.score ?? 0) <= scoreMax);
    const matchSource = sourceFilter.size === 0 || (lead.source && sourceFilter.has(lead.source));
    return matchSearch && matchStatus && matchRating && matchReview && matchCat && matchCampaign && matchLeadId && matchEmail && matchPhone && matchScore && matchSource;
  });

  const toggleStatus = (s: string) => { const n = new Set(statusFilter); n.has(s) ? n.delete(s) : n.add(s); setStatusFilter(n); };
  const toggleCategory = (c: string) => { const n = new Set(categoryFilter); n.has(c) ? n.delete(c) : n.add(c); setCategoryFilter(n); };
  const toggleCampaign = (c: string) => { const n = new Set(campaignFilter); n.has(c) ? n.delete(c) : n.add(c); setCampaignFilter(n); };
  const toggleLeadId = (lid: string) => { const n = new Set(leadIdFilter); n.has(lid) ? n.delete(lid) : n.add(lid); setLeadIdFilter(n); };
  const toggleSource = (s: string) => { const n = new Set(sourceFilter); n.has(s) ? n.delete(s) : n.add(s); setSourceFilter(n); };
  const clearAllFilters = () => { setStatusFilter(new Set()); setRatingMin(''); setRatingMax(''); setReviewMin(''); setReviewMax(''); setCategoryFilter(new Set()); setCampaignFilter(new Set()); setLeadIdFilter(new Set()); setHasEmail(false); setHasPhone(false); setScoreMin(''); setScoreMax(''); setSourceFilter(new Set()); };
  const hasActiveFilters = statusFilter.size > 0 || !!ratingMin || !!ratingMax || !!reviewMin || !!reviewMax || categoryFilter.size > 0 || campaignFilter.size > 0 || leadIdFilter.size > 0 || hasEmail || hasPhone || !!scoreMin || !!scoreMax || sourceFilter.size > 0;
  const activeFilterCount = (statusFilter.size > 0 ? 1 : 0) + (ratingMin || ratingMax ? 1 : 0) + (reviewMin || reviewMax ? 1 : 0) + (categoryFilter.size > 0 ? 1 : 0) + (campaignFilter.size > 0 ? 1 : 0) + (leadIdFilter.size > 0 ? 1 : 0) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (scoreMin || scoreMax ? 1 : 0) + (sourceFilter.size > 0 ? 1 : 0);
  const toggleLeadSelection = (id: number) => { const n = new Set(selectedLeads); n.has(id) ? n.delete(id) : n.add(id); setSelectedLeads(n); };
  const toggleAllSelection = () => setSelectedLeads(selectedLeads.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map(l => l.id)));

  const handleExport = () => {
    const headers = ['name', 'category', 'company_phone', 'email', 'address', 'website', 'rating', 'review_count', 'status'];
    const rows = filteredLeads.map(l => [l.name, l.category, l.company_phone, l.company_email, l.address, l.website, l.rating, l.review_count, l.status].map(f => `"${String(f || '').replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setMenuOpen(false);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.match(/("[^"]*"|[^,]*)/g) || [];
      const row: any = {};
      headers.forEach((h, i) => { row[h] = (values[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'); });
      return row;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportErrors([]);
    setImportStats(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        let data: any[] = file.name.endsWith('.json') ? JSON.parse(ev.target?.result as string) : parseCSV(ev.target?.result as string);
        if (!Array.isArray(data)) data = [data];
        const errors: string[] = [];
        const ts = Date.now();
        const mapped = data.map((item, idx) => {
          const m: any = { place_id: item.place_id || item.placeId || `import-${ts}-${idx}`, name: item.name || item.title || '', address: item.address || '', street_address: item.street_address || item.street || '', neighborhood: item.neighborhood || '', city: item.city || '', postal_code: item.postal_code || item.postalCode || '', company_phone: item.company_phone || item.phone || '', source: item.source || item.phone_unformatted || item.phoneUnformatted || '', website: item.website || '', google_maps_url: item.google_maps_url || item.url || '', company_email: item.company_email || item.email || '', rating: item.rating || item.totalScore || null, review_count: item.review_count || 0, price_level: item.price_level || item.price || null, category: item.category || item.categoryName || '', fid: item.fid || '', latitude: item.latitude || null, longitude: item.longitude || null, scraped_at: item.scraped_at || item.scrapedAt || new Date().toISOString(), status: 'new' };
          if (!m.name) errors.push(`Row ${idx + 1}: Missing name`);
          return m;
        });
        setImportPreview(mapped);
        setImportErrors(errors);
        if (!errors.length && mapped.length) {
          try {
            const r = await axios.post('/api/crm/leads/bulk-import/?validate=true', mapped);
            setImportStats(r.data);
          } catch { /* validation call failed, allow import anyway */ }
        }
      } catch { setImportErrors(['Failed to parse file.']); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview.length || importErrors.length) return;
    setImporting(true);
    try {
      await axios.post('/api/crm/leads/bulk-import/', importPreview);
      await fetchLeads(); await fetchStats();
      setImporting(false); setShowImportModal(false); setImportFile(null); setImportPreview([]);
    } catch (e: any) {
      setImportErrors([e.response?.data?.error || 'Import failed']);
      setImporting(false);
    }
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
          sources={sources}
          sourceFilter={sourceFilter}
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
          onToggleSource={toggleSource}
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
                    <button onClick={() => { setShowImportModal(true); setMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                      Import leads
                    </button>
                    <button onClick={handleExport} className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                      Export CSV
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between flex-none">
              <h3 className="text-base font-semibold text-white">Import leads</h3>
              <button onClick={() => setShowImportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleFileSelect} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/20 transition-all duration-150 text-center cursor-pointer"
              >
                {importFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{importFile.name}</span>
                  </div>
                ) : 'Click to select a JSON or CSV file'}
              </button>

              {importErrors.length > 0 && (
                <div className="bg-rose-900/10 border border-rose-800/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-rose-400 mb-1.5">Errors</p>
                  {importErrors.map((e, i) => <p key={i} className="text-sm text-rose-300/80">{e}</p>)}
                </div>
              )}

              {importStats && (
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">{importStats.total}</p>
                    <p className="text-xs text-zinc-500">Total in file</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-400">{importStats.batch_duplicates}</p>
                    <p className="text-xs text-zinc-500">Duplicates in file</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-rose-400">{importStats.crm_duplicates}</p>
                    <p className="text-xs text-zinc-500">Already in CRM</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-emerald-400">{importStats.unique_to_import}</p>
                    <p className="text-xs text-zinc-500">Unique to import</p>
                  </div>
                </div>
              )}

              {importPreview.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-500 mb-3">Preview</p>
                  <div className="card overflow-hidden max-h-48">
                    <table className="min-w-full">
                      <thead className="bg-zinc-800">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/30">
                        {importPreview.slice(0, 5).map((l, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2.5 text-sm text-white truncate max-w-[180px]">{l.name}</td>
                            <td className="px-4 py-2.5 text-sm text-zinc-400">{l.category || <span className="text-zinc-600">—</span>}</td>
                            <td className="px-4 py-2.5 text-sm text-zinc-400 font-mono">{l.company_phone || <span className="text-zinc-600">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 5 && <p className="text-xs text-zinc-600 text-center py-2.5 border-t border-zinc-800/30">+{importPreview.length - 5} more leads</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 flex-none">
              <button onClick={() => setShowImportModal(false)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={handleImport}
                disabled={!importPreview.length || !!importErrors.length || importing}
                className="btn-primary text-sm"
              >
                {importing ? `Importing...` : importStats ? `Import ${importStats.unique_to_import} unique leads` : `Import ${importPreview.length} leads`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
