'use client';

import { useState } from 'react';
import axios from 'axios';

interface PriorityLeadsQueueProps {
  leads: any[];
  loading: boolean;
  minScore: string;
  onMinScoreChange: (score: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  activeBucket: string;
  onOpenLead: (lead: any) => void;
  onScheduleFollowUp: (lead: any) => void;
  onLogOutreach: (lead: any) => void;
  onRefresh: () => void;
}

const BUCKET_DESCRIPTIONS: Record<string, { title: string; subtitle: string }> = {
  send_today: {
    title: 'Send Today Queue',
    subtitle: 'Contact-ready accounts with verified decision-maker and email',
  },
  follow_up_today: {
    title: 'Follow-Up Today Queue',
    subtitle: 'Scheduled follow-ups due today and overdue touches',
  },
  meetings: {
    title: 'Active Deals & Meetings Queue',
    subtitle: 'Booked demos, proposals and in-flight sales discussions',
  },
  needs_research: {
    title: 'Needs Research Queue',
    subtitle: 'High-fit accounts missing direct email or decision-maker contact',
  },
};

export default function PriorityLeadsQueue({
  leads,
  loading,
  minScore,
  onMinScoreChange,
  searchTerm,
  onSearchChange,
  activeBucket,
  onOpenLead,
  onScheduleFollowUp,
  onLogOutreach,
  onRefresh,
}: PriorityLeadsQueueProps) {
  const [selectedPitchLead, setSelectedPitchLead] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickStatusChange = async (leadId: number, newStatus: string) => {
    setUpdatingId(leadId);
    try {
      await axios.patch(`/api/crm/leads/${leadId}/status/`, { status: newStatus });
      onRefresh();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getScoreBadge = (score: number | null, label?: string) => {
    if (score == null) return null;
    const isHot = score >= 70;
    const isWarm = score >= 40 && score < 70;

    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isHot ? 'bg-emerald-400' : isWarm ? 'bg-amber-400' : 'bg-zinc-500'
          }`}
        />
        {score} · {label ? label.toUpperCase() : isHot ? 'HOT' : isWarm ? 'WARM' : 'COLD'}
      </span>
    );
  };

  const bucketInfo = BUCKET_DESCRIPTIONS[activeBucket] || {
    title: 'Ranked Priority Leads',
    subtitle: 'Accounts prioritized by AI qualification score and pipeline state',
  };

  return (
    <div className="card overflow-hidden flex flex-col flex-1 min-h-0 bg-zinc-900/30 border border-zinc-800/80 rounded-xl">
      {/* Sub-header Controls */}
      <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between flex-wrap gap-3 bg-zinc-950/20">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200 tracking-wide flex items-center gap-2">
            {bucketInfo.title}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700/50">
              {leads.length}
            </span>
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{bucketInfo.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Search companies, contacts..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <svg
              className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          {/* Min Score Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Score:</span>
            <select
              value={minScore}
              onChange={(e) => onMinScoreChange(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors"
            >
              <option value="">All</option>
              <option value="80">80+ (Hot)</option>
              <option value="60">60+ (Warm)</option>
              <option value="40">40+ (Moderate)</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            title="Refresh Queue"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-300' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Leads Queue List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-6 h-6 text-zinc-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-zinc-500">Loading queue...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xs text-zinc-400 font-medium">No leads currently in this queue</p>
            <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
              Accounts in this bucket have been handled or moved to other stages.
            </p>
          </div>
        ) : (
          leads.map((lead) => {
            const dm = lead.decision_maker || lead.company_people?.[0];
            const phone = dm?.mobile_number || lead.company_phone;
            const email = dm?.personal_email || dm?.email || lead.company_email;
            const emailDraft = lead.email_drafts?.[0];
            const isOverdue = lead.is_overdue;
            const isDueToday = lead.is_due_today;

            return (
              <div
                key={lead.id}
                onClick={() => onOpenLead(lead)}
                className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all duration-150 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Lead Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
                        {lead.company_name}
                      </h4>

                      {lead.lid && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/40">
                          {lead.lid}
                        </span>
                      )}

                      {getScoreBadge(lead.score, lead.score_label)}

                      {lead.recommended_service && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
                          {lead.recommended_service}
                        </span>
                      )}

                      {lead.city && (
                        <span className="text-[11px] text-zinc-500">
                          {lead.city}{lead.state ? `, ${lead.state}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Decision Maker & Contact Strip */}
                    <div className="mt-2 flex items-center gap-2.5 text-xs text-zinc-300 flex-wrap">
                      {dm ? (
                        <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                          <span>{dm.full_name}</span>
                          {dm.job_title && (
                            <span className="text-zinc-500 font-normal">· {dm.job_title}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[11px] italic">
                          No decision maker attached
                        </span>
                      )}

                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800/60 hover:bg-zinc-800 px-2 py-0.5 rounded text-[11px] border border-zinc-700/50 transition-colors"
                          title="Phone"
                        >
                          <span>📞</span> {phone}
                        </a>
                      )}

                      {email && (
                        <a
                          href={`mailto:${email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800/60 hover:bg-zinc-800 px-2 py-0.5 rounded text-[11px] border border-zinc-700/50 truncate max-w-xs transition-colors"
                          title="Verified Email"
                        >
                          <span>✉️</span> {email}
                        </a>
                      )}

                      {(dm?.linkedin || lead.company_linkedin) && (
                        <a
                          href={dm?.linkedin || lead.company_linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors"
                          title="LinkedIn"
                        >
                          LinkedIn ↗
                        </a>
                      )}

                      {lead.company_website && (
                        <a
                          href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-500 hover:text-zinc-300 text-[11px] transition-colors"
                          title="Website"
                        >
                          Website ↗
                        </a>
                      )}
                    </div>

                    {/* "Why Now" / Sales Brief Block */}
                    <div className="mt-2.5 p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-lg text-xs text-zinc-400 leading-relaxed">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mr-1.5">
                        WHY NOW:
                      </span>
                      {lead.sales_brief || lead.why_now || `${lead.company_name} is a qualified account ready for sales contact.`}
                    </div>

                    {/* Scheduled Touch Note if any */}
                    {(isOverdue || isDueToday || lead.follow_up_date) && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">Scheduled:</span>
                        <span className={`px-1.5 py-0.2 rounded text-[11px] font-medium border ${
                          isOverdue 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                            : isDueToday 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                            : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40'
                        }`}>
                          {isOverdue ? `Overdue (${lead.follow_up_date})` : isDueToday ? 'Due Today' : lead.follow_up_date}
                        </span>
                        {lead.follow_up_action_type && (
                          <span className="text-zinc-500">via {lead.follow_up_action_type.toUpperCase()}</span>
                        )}
                        {lead.follow_up_notes && (
                          <span className="text-zinc-500 truncate max-w-sm">· "{lead.follow_up_notes}"</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex flex-col sm:items-end gap-2 flex-none" onClick={(e) => e.stopPropagation()}>
                    {/* Fast Status Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-500">Status:</span>
                      <select
                        value={lead.status}
                        disabled={updatingId === lead.id}
                        onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                        className="bg-zinc-900 border border-zinc-700/60 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors"
                      >
                        <option value="new">New</option>
                        <option value="qualified">Qualified</option>
                        <option value="contacted">Contacted</option>
                        <option value="follow_up_scheduled">Follow-up Scheduled</option>
                        <option value="in_discussion">In Discussion</option>
                        <option value="meeting_booked">Meeting Booked</option>
                        <option value="proposal_sent">Proposal Sent</option>
                        <option value="closed_won">Closed Won</option>
                        <option value="closed_lost">Closed Lost</option>
                        <option value="unqualified">Unqualified</option>
                      </select>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {emailDraft && (
                        <button
                          onClick={() => setSelectedPitchLead(lead)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-colors"
                          title="View cold outreach email draft"
                        >
                          AI Pitch
                        </button>
                      )}

                      <button
                        onClick={() => onLogOutreach(lead)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-colors"
                        title="Log outreach touch"
                      >
                        Log Touch
                      </button>

                      <button
                        onClick={() => onScheduleFollowUp(lead)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-colors"
                        title="Schedule next follow-up"
                      >
                        Follow-Up
                      </button>

                      <button
                        onClick={() => onOpenLead(lead)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="View details"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Cold Outreach Modal */}
      {selectedPitchLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-white">AI Cold Outreach Pitch</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Prepared for {selectedPitchLead.company_name} ({selectedPitchLead.decision_maker?.full_name || 'Decision Maker'})
                </p>
              </div>
              <button
                onClick={() => setSelectedPitchLead(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Subject Line
                </label>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 font-medium">
                  {selectedPitchLead.email_drafts?.[0]?.subject || `Quick question regarding ${selectedPitchLead.company_name}`}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Email Draft
                </label>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans">
                  {selectedPitchLead.email_drafts?.[0]?.body || 'No generated body available.'}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between pt-3.5 border-t border-zinc-800">
              <span className="text-[11px] text-zinc-500">
                1-Click Copy
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPitchLead(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const draft = selectedPitchLead.email_drafts?.[0];
                    const fullText = `Subject: ${draft?.subject || ''}\n\n${draft?.body || ''}`;
                    handleCopyPitch(fullText);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-200 text-zinc-950 transition-colors shadow-sm"
                >
                  {copied ? '✓ Copied' : 'Copy Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
