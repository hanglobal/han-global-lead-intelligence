'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SalesMetrics, { SalesBucketType } from '@/app/(dashboard)/sales/components/SalesMetrics';
import PriorityLeadsQueue from '@/app/(dashboard)/sales/components/PriorityLeadsQueue';
import ScheduleFollowUpModal from '@/app/(dashboard)/sales/components/ScheduleFollowUpModal';
import LogOutreachModal from '@/app/(dashboard)/sales/components/LogOutreachModal';
import LeadView from '@/app/(dashboard)/crm/components/LeadView';

export default function SalesPage() {
  const [activeBucket, setActiveBucket] = useState<SalesBucketType>('send_today');
  const [overview, setOverview] = useState<any | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Bucket leads state
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [minScore, setMinScore] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [crmLeadModalOpen, setCrmLeadModalOpen] = useState(false);

  // Operational metrics drawer state
  const [showOperationalMetrics, setShowOperationalMetrics] = useState(false);

  // Fetch overview (bucket counts + pipeline metrics)
  const fetchOverview = useCallback(async () => {
    try {
      const res = await axios.get('/api/crm/sales/overview/');
      setOverview(res.data);
    } catch (err) {
      console.error('Failed to fetch sales overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // Fetch bucket leads
  const fetchBucketLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      let url = `/api/crm/sales/bucket-leads/?bucket=${activeBucket}&page_size=50`;
      if (minScore) url += `&min_score=${minScore}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const res = await axios.get(url);
      setLeads(res.data.results || []);
    } catch (err) {
      console.error('Failed to fetch bucket leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [activeBucket, minScore, searchTerm]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchBucketLeads();
    }, 200);
    return () => clearTimeout(debounce);
  }, [fetchBucketLeads]);

  const handleSuccessUpdate = () => {
    fetchOverview();
    fetchBucketLeads();
  };

  const pipeline = overview?.pipeline || {};

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Top Header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-white tracking-tight">Sales Action Center</h1>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded border border-zinc-700/60">
              Solo Admin
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daily prioritized sales actions, follow-ups and active pipeline opportunities.
          </p>
        </div>

        {/* Operational Health Toggle */}
        <button
          onClick={() => setShowOperationalMetrics(!showOperationalMetrics)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors flex items-center gap-2"
        >
          <span>{showOperationalMetrics ? 'Hide Metrics' : 'System Health & Pipeline'}</span>
          <span className="text-zinc-500 text-[10px]">{showOperationalMetrics ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Top Layer: 4 Core Client Action Buckets */}
      <SalesMetrics
        overview={overview}
        loading={overviewLoading}
        activeBucket={activeBucket}
        onBucketChange={(bucket) => setActiveBucket(bucket)}
      />

      {/* Collapsible Operational Health & Pipeline Metrics */}
      {showOperationalMetrics && (
        <div className="mb-5 p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Operational & Pipeline Snapshot
            </h4>
            <span className="text-[10px] text-zinc-500">Live Database Metrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Uncontacted</span>
              <p className="text-base font-semibold text-zinc-200 mt-0.5">{overview?.total_uncontacted ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Hot Leads (70+)</span>
              <p className="text-base font-semibold text-zinc-200 mt-0.5">{overview?.hot_uncontacted ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Touches This Week</span>
              <p className="text-base font-semibold text-zinc-200 mt-0.5">{overview?.contacted_this_week ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">In Discussion</span>
              <p className="text-base font-semibold text-zinc-200 mt-0.5">{pipeline.in_discussion ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Meetings Booked</span>
              <p className="text-base font-semibold text-zinc-200 mt-0.5">{pipeline.meeting_booked ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Deals Closed Won</span>
              <p className="text-base font-semibold text-zinc-200 mt-0.5">{pipeline.closed_won ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Priority Leads Queue for the Active Bucket */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PriorityLeadsQueue
          leads={leads}
          loading={leadsLoading}
          minScore={minScore}
          onMinScoreChange={(s) => setMinScore(s)}
          searchTerm={searchTerm}
          onSearchChange={(s) => setSearchTerm(s)}
          activeBucket={activeBucket}
          onOpenLead={(lead) => {
            setSelectedLead(lead);
            setCrmLeadModalOpen(true);
          }}
          onScheduleFollowUp={(lead) => {
            setSelectedLead(lead);
            setScheduleModalOpen(true);
          }}
          onLogOutreach={(lead) => {
            setSelectedLead(lead);
            setLogModalOpen(true);
          }}
          onRefresh={handleSuccessUpdate}
        />
      </div>

      {/* Schedule Follow-up Modal */}
      <ScheduleFollowUpModal
        lead={selectedLead}
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={handleSuccessUpdate}
      />

      {/* Log Outreach Modal */}
      <LogOutreachModal
        lead={selectedLead}
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={handleSuccessUpdate}
      />

      {/* CRM Full Lead View Modal */}
      <LeadView
        lead={selectedLead}
        isOpen={crmLeadModalOpen}
        onClose={() => {
          setCrmLeadModalOpen(false);
          handleSuccessUpdate();
        }}
      />
    </div>
  );
}
