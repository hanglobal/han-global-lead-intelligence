'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import LeadHunterDashboard from '@/app/(dashboard)/lead-hunter/components/LeadHunterDashboard';
import CampaignList from '@/app/(dashboard)/lead-hunter/components/CampaignList';
import CampaignDetails from '@/app/(dashboard)/lead-hunter/components/CampaignDetails';
import CampaignForm from '@/app/(dashboard)/lead-hunter/components/CampaignForm';

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
  stage?: string;
  actor_type?: string;
  nexus_campaign_id?: string | null;
  filters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function LeadHunterPage() {
  const params = useParams();
  const router = useRouter();
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
  const initialUrlHandled = useRef(false);

  // 1. Fetch live stats & campaigns list
  useEffect(() => {
    fetchStats();
    fetchCampaigns();
  }, [refreshTrigger]);

  // 2. Listen to SSE live background updates
  useEffect(() => {
    const handleCampaignCompleted = () => {
      setRefreshTrigger((p) => p + 1);
    };
    const handleCampaignProgress = () => {
      setRefreshTrigger((p) => p + 1);
    };

    window.addEventListener('campaign-completed', handleCampaignCompleted);
    window.addEventListener('campaign-progress', handleCampaignProgress);
    return () => {
      window.removeEventListener('campaign-completed', handleCampaignCompleted);
      window.removeEventListener('campaign-progress', handleCampaignProgress);
    };
  }, []);

  // 3. Handle initial URL navigation (e.g. direct load /lead-hunter/createcampaign or /lead-hunter/cam_01)
  useEffect(() => {
    if (!initialUrlHandled.current && campaigns.length > 0) {
      initialUrlHandled.current = true;

      if (cidFromUrl === 'createcampaign') {
        setShowCreateModal(true);
      } else if (isEditUrl && cidFromUrl) {
        const found = campaigns.find(
          (c) => c.campaign_id.toLowerCase() === cidFromUrl.toLowerCase()
        );
        if (found) {
          setEditCampaign(found);
          setShowEditModal(true);
        }
      } else if (cidFromUrl) {
        const found = campaigns.find(
          (c) => c.campaign_id.toLowerCase() === cidFromUrl.toLowerCase()
        );
        if (found) {
          setSelectedCampaign(found);
        }
      }
    } else if (campaigns.length > 0 && selectedCampaign) {
      // Sync selected campaign's updated properties (status, count, etc.) from refreshed list
      const updated = campaigns.find((c) => c.id === selectedCampaign.id);
      if (updated && (updated.status !== selectedCampaign.status || updated.total_leads_found !== selectedCampaign.total_leads_found)) {
        setSelectedCampaign(updated);
      }
    }
  }, [campaigns, cidFromUrl, isEditUrl]);

  const fetchStats = async () => {
    try {
      const r = await axios.get('/api/lead-hunter/stats/');
      const d = r.data;
      setStats({
        pending: d.by_status?.pending || 0,
        running: d.by_status?.running || 0,
        completed: d.by_status?.completed || 0,
        failed: d.by_status?.failed || 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const r = await axios.get('/api/lead-hunter/campaigns/');
      setCampaigns(r.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Modal Actions & Campaign Selection ─────────────────────────────────
  const handleCreateCampaign = () => {
    setShowCreateModal(true);
    window.history.replaceState({}, '', '/lead-hunter/createcampaign');
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    const targetUrl = selectedCampaign ? `/lead-hunter/${selectedCampaign.campaign_id.toLowerCase()}` : '/lead-hunter';
    window.history.replaceState({}, '', targetUrl);
  };

  const handleCampaignCreated = () => {
    setShowCreateModal(false);
    setRefreshTrigger((p) => p + 1);
    window.history.replaceState({}, '', '/lead-hunter');
  };

  const handleSelectCampaign = (c: Campaign) => {
    setSelectedCampaign(c);
    window.history.replaceState({ campaignId: c.id }, '', `/lead-hunter/${c.campaign_id.toLowerCase()}`);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditCampaign(campaign);
    setShowEditModal(true);
    window.history.replaceState({}, '', `/lead-hunter/${campaign.campaign_id.toLowerCase()}/edit`);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditCampaign(null);
    const targetUrl = selectedCampaign ? `/lead-hunter/${selectedCampaign.campaign_id.toLowerCase()}` : '/lead-hunter';
    window.history.replaceState({}, '', targetUrl);
  };

  const handleEditCampaignSaved = () => {
    setShowEditModal(false);
    setEditCampaign(null);
    setRefreshTrigger((p) => p + 1);
    if (selectedCampaign) {
      axios
        .get(`/api/lead-hunter/campaigns/${selectedCampaign.id}/`)
        .then((r) => setSelectedCampaign(r.data))
        .catch(console.error);
    }
  };

  const handleCampaignUpdated = () => {
    setRefreshTrigger((p) => p + 1);
    if (selectedCampaign) {
      axios
        .get(`/api/lead-hunter/campaigns/${selectedCampaign.id}/`)
        .then((r) => setSelectedCampaign(r.data))
        .catch(console.error);
    }
  };

  const handleCampaignDeleted = () => {
    setRefreshTrigger((p) => p + 1);
    setSelectedCampaign(null);
    window.history.replaceState({}, '', '/lead-hunter');
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
            onSelectCampaign={handleSelectCampaign}
            onCreateCampaign={handleCreateCampaign}
            refreshTrigger={refreshTrigger}
            selectedId={selectedCampaign?.id || null}
          />
        </div>

        <div className="flex-1 card overflow-hidden">
          {selectedCampaign ? (
            <CampaignDetails
              key={selectedCampaign.id}
              campaign={selectedCampaign}
              embedded={true}
              onCampaignUpdated={handleCampaignUpdated}
              onCampaignDeleted={handleCampaignDeleted}
              onEditCampaign={handleEditCampaign}
              onClose={() => {
                setSelectedCampaign(null);
                window.history.replaceState({}, '', '/lead-hunter');
              }}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-fade-in" onClick={handleCloseCreateModal}>
          <div className="bg-[#121215] border border-zinc-800/90 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/50 flex-none">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">New Campaign</h3>
                <p className="text-xs text-zinc-400">Configure targeting parameters for your campaign</p>
              </div>
              <button onClick={handleCloseCreateModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-150 flex-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-7 overflow-y-auto flex-1">
              <CampaignForm onSuccess={handleCampaignCreated} />
            </div>
          </div>
        </div>
      )}

      {showEditModal && editCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-fade-in" onClick={handleCloseEditModal}>
          <div className="bg-[#121215] border border-zinc-800/90 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/50 flex-none">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">Edit Campaign</h3>
                <p className="text-xs text-zinc-400">Configure targeting parameters for your campaign</p>
              </div>
              <button onClick={handleCloseEditModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-150 flex-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-7 overflow-y-auto flex-1">
              <CampaignForm initialData={editCampaign} onSuccess={handleEditCampaignSaved} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
