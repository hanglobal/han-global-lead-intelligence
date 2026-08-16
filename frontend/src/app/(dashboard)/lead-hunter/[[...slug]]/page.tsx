'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import LeadHunterDashboard from '@/components/lead-hunter/LeadHunterDashboard';
import CampaignList from '@/components/lead-hunter/CampaignList';
import CampaignDetails from '@/components/lead-hunter/CampaignDetails';
import CampaignForm from '@/components/lead-hunter/CampaignForm';

interface Campaign {
  id: number;
  campaign_id: string;
  name: string;
  description: string;
  niche: string;
  location: string;
  lead_count: number | null;
  total_leads_found?: number;
  status: string;
  apify_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function LeadHunterPage() {
  const params = useParams();
  const slug = params?.slug as string[] | undefined;
  const cidFromUrl = slug?.[0] || null;
  const isEditUrl = slug?.[1] === 'edit';

  const [stats, setStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => { fetchStats(); fetchCampaigns(); }, [refreshTrigger]);

  useEffect(() => {
    const handleCampaignCompleted = (e: any) => {
      console.log("SSE Campaign Completed - refreshing Lead Hunter data:", e.detail);
      setRefreshTrigger(p => p + 1);
    };
    const handleCampaignProgress = () => {
      setRefreshTrigger(p => p + 1);
    };
    window.addEventListener('campaign-completed', handleCampaignCompleted);
    window.addEventListener('campaign-progress', handleCampaignProgress);
    return () => {
      window.removeEventListener('campaign-completed', handleCampaignCompleted);
      window.removeEventListener('campaign-progress', handleCampaignProgress);
    };
  }, []);

  useEffect(() => {
    setShowCreateModal(false);

    setShowEditModal(false);
    if (isEditUrl && cidFromUrl && campaigns.length > 0) {
      const found = campaigns.find(c => c.campaign_id.toLowerCase() === cidFromUrl.toLowerCase());
      if (found) { setEditCampaign(found); setShowEditModal(true); setSelectedCampaign(null); }
    } else if (cidFromUrl === 'createcampaign') {
      setShowCreateModal(true);
      setSelectedCampaign(null);
    } else if (cidFromUrl && campaigns.length > 0) {
      const found = campaigns.find(c => c.campaign_id.toLowerCase() === cidFromUrl.toLowerCase());
      if (found) setSelectedCampaign(found);
    } else if (!cidFromUrl) {
      setSelectedCampaign(null);
    }
  }, [cidFromUrl, isEditUrl, campaigns]);

  const handleBrowserNav = useCallback(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/lead-hunter\/(.+)$/);
    setShowCreateModal(false);
    setShowEditModal(false);
    if (match) {
      const rest = match[1];
      if (rest === 'createcampaign') {
        setShowCreateModal(true);
        setSelectedCampaign(null);
      } else if (rest.endsWith('/edit')) {
        const cid = rest.replace('/edit', '');
        const found = campaigns.find(c => c.campaign_id.toLowerCase() === cid.toLowerCase());
        if (found) { setEditCampaign(found); setShowEditModal(true); setSelectedCampaign(null); }
      } else {
        const found = campaigns.find(c => c.campaign_id.toLowerCase() === rest.toLowerCase());
        if (found) setSelectedCampaign(found);
        else if (campaigns.length > 0) setSelectedCampaign(null);
      }
    } else {
      setSelectedCampaign(null);
    }
  }, [campaigns]);

  useEffect(() => {
    window.addEventListener('popstate', handleBrowserNav);
    return () => window.removeEventListener('popstate', handleBrowserNav);
  }, [handleBrowserNav]);

  const fetchStats = async () => {
    try {
      const r = await axios.get('/api/lead-hunter/stats/');
      const d = r.data;
      setStats({ pending: d.by_status?.pending || 0, running: d.by_status?.running || 0, completed: d.by_status?.completed || 0, failed: d.by_status?.failed || 0 });
    } catch (e) { console.error(e); }
  };

  const fetchCampaigns = async () => {
    try { const r = await axios.get('/api/lead-hunter/campaigns/'); setCampaigns(r.data); }
    catch (e) { console.error(e); }
  };

  const handleCreateCampaign = () => {
    setShowCreateModal(true);
    setSelectedCampaign(null);
    window.history.pushState({}, '', '/lead-hunter/createcampaign');
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    window.history.pushState({}, '', '/lead-hunter');
  };

  const handleCampaignCreated = () => {
    setShowCreateModal(false);
    setRefreshTrigger(p => p + 1);
    window.history.pushState({}, '', '/lead-hunter');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditCampaign(campaign);
    setShowEditModal(true);
    setSelectedCampaign(null);
    window.history.pushState({}, '', `/lead-hunter/${campaign.campaign_id.toLowerCase()}/edit`);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditCampaign(null);
    window.history.pushState({}, '', '/lead-hunter');
  };

  const handleEditCampaignSaved = () => {
    setShowEditModal(false);
    setEditCampaign(null);
    setRefreshTrigger(p => p + 1);
    window.history.pushState({}, '', '/lead-hunter');
  };

  const handleCampaignUpdated = () => {
    setRefreshTrigger(p => p + 1);
    if (selectedCampaign) {
      axios.get(`/api/lead-hunter/campaigns/${selectedCampaign.id}/`)
        .then(r => setSelectedCampaign(r.data))
        .catch(console.error);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="mb-4 flex-none">
        <h1 className="text-lg font-semibold text-white">Lead Hunter</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Create and manage lead generation campaigns</p>
      </div>

      <LeadHunterDashboard stats={stats} />

      <div className="flex-1 flex gap-3 min-h-0">
        <div className="w-72 flex-none card overflow-hidden flex flex-col">
          <CampaignList
            onSelectCampaign={(c) => { setSelectedCampaign(c); window.history.pushState({ campaignId: c.id }, '', `/lead-hunter/${c.campaign_id.toLowerCase()}`); }}
            onCreateCampaign={handleCreateCampaign}
            refreshTrigger={refreshTrigger}
            selectedId={selectedCampaign?.id || null}
          />
        </div>

        <div className="flex-1 card overflow-hidden">
          {selectedCampaign ? (
            <CampaignDetails
              campaign={selectedCampaign}
              embedded={true}
              onCampaignUpdated={handleCampaignUpdated}
              onCampaignDeleted={() => { setRefreshTrigger(p => p + 1); setSelectedCampaign(null); window.history.pushState({}, '', '/lead-hunter'); }}
              onEditCampaign={handleEditCampaign}
              onClose={() => { setSelectedCampaign(null); window.history.pushState({}, '', '/lead-hunter'); }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500">Select a campaign</p>
                <p className="text-xs text-zinc-600 mt-1">or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleCloseCreateModal}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">New campaign</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Set up a Google Maps extraction campaign</p>
              </div>
              <button onClick={handleCloseCreateModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150 flex-none">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CampaignForm onSuccess={handleCampaignCreated} />
            </div>
          </div>
        </div>
      )}

      {showEditModal && editCampaign && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleCloseEditModal}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Edit campaign</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Update campaign details</p>
              </div>
              <button onClick={handleCloseEditModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150 flex-none">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <CampaignForm initialData={editCampaign} onSuccess={handleEditCampaignSaved} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
