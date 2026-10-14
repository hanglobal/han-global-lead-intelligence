'use client';

import { useState } from 'react';
import axios from 'axios';

interface LogOutreachModalProps {
  lead: {
    id: number;
    lid?: string;
    company_name: string;
    status?: string;
    decision_maker?: any;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedLead: any) => void;
}

export default function LogOutreachModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: LogOutreachModalProps) {
  const [actionType, setActionType] = useState('call');
  const [outcome, setOutcome] = useState('connected');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('10:00 AM');
  const [nextActionType, setNextActionType] = useState('call');
  const [nextNotes, setNextNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const dm = lead.decision_maker;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Log the outreach
      const res = await axios.post(`/api/crm/leads/${lead.id}/log-outreach/`, {
        action_type: actionType,
        outcome: outcome,
        notes: notes,
        new_status: newStatus || undefined,
      });

      let updated = res.data.lead || res.data;

      // 2. If user checked scheduleNext, schedule follow-up as well
      if (scheduleNext && nextDate) {
        const followRes = await axios.post(`/api/crm/leads/${lead.id}/schedule-followup/`, {
          follow_up_date: nextDate,
          follow_up_time: nextTime,
          follow_up_action_type: nextActionType,
          follow_up_priority: 'medium',
          follow_up_notes: nextNotes || `Follow up after ${actionType}`,
        });
        updated = followRes.data.lead || followRes.data;
      }

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to log outreach:', err);
      setError(err.response?.data?.error || 'Failed to log outreach');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              Log Sales Outreach
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-sm">
              {lead.company_name} {lead.lid ? `(${lead.lid})` : ''}
              {dm ? ` • ${dm.full_name} (${dm.job_title || 'Decision Maker'})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-zinc-200">
              {error}
            </div>
          )}

          {/* Action Type Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Outreach Channel
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setActionType('call'); setOutcome('connected'); }}
                className={`py-2 px-2 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  actionType === 'call'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>📞</span>
                <span>Phone Call</span>
              </button>
              <button
                type="button"
                onClick={() => { setActionType('email'); setOutcome('sent_pitch'); }}
                className={`py-2 px-2 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  actionType === 'email'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>✉️</span>
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => { setActionType('linkedin'); setOutcome('inmail_sent'); }}
                className={`py-2 px-2 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  actionType === 'linkedin'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>💼</span>
                <span>LinkedIn</span>
              </button>
              <button
                type="button"
                onClick={() => { setActionType('meeting'); setOutcome('meeting_held'); }}
                className={`py-2 px-2 text-xs font-medium rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  actionType === 'meeting'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span>🤝</span>
                <span>Meeting</span>
              </button>
            </div>
          </div>

          {/* Outcome Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Outreach Outcome
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {actionType === 'call' && (
                <>
                  <option value="connected">✅ Connected / Conversation Held</option>
                  <option value="left_voicemail">🎙️ Left Voicemail</option>
                  <option value="no_answer">📵 No Answer / Rang Out</option>
                  <option value="gatekeeper_blocked">🛑 Gatekeeper Blocked / Not Available</option>
                  <option value="wrong_number">❌ Wrong / Disconnected Number</option>
                </>
              )}
              {actionType === 'email' && (
                <>
                  <option value="sent_pitch">📤 Sent Initial Cold Pitch</option>
                  <option value="sent_followup">🔁 Sent Follow-Up Email</option>
                  <option value="replied_interested">🔥 Prospect Replied - Interested</option>
                  <option value="replied_not_interested">🚫 Prospect Replied - Not Interested</option>
                  <option value="bounced">⚠️ Email Bounced</option>
                </>
              )}
              {actionType === 'linkedin' && (
                <>
                  <option value="inmail_sent">📨 Sent Direct Message / InMail</option>
                  <option value="connection_requested">🤝 Sent Connection Request</option>
                  <option value="replied">💬 Replied on LinkedIn</option>
                </>
              )}
              {actionType === 'meeting' && (
                <>
                  <option value="meeting_held">🎯 Demo / Discovery Meeting Held</option>
                  <option value="meeting_rescheduled">🔄 Meeting Rescheduled</option>
                  <option value="no_show">⏳ Prospect No-Show</option>
                </>
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Conversation Notes & Context
            </label>
            <textarea
              rows={3}
              required
              placeholder="What was discussed? Any specific objections or next steps mentioned?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Pipeline Stage Update */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Update Lead Status (Optional)
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="">Keep Current Status ({lead.status || 'new'})</option>
              <option value="contacted">📞 Contacted / In Outreach</option>
              <option value="follow_up_scheduled">📅 Follow-Up Scheduled</option>
              <option value="in_discussion">💬 In Discussion / Evaluating</option>
              <option value="meeting_booked">🤝 Meeting / Demo Booked</option>
              <option value="closed_won">🏆 Closed Won</option>
              <option value="closed_lost">❌ Closed Lost</option>
              <option value="unqualified">🚫 Disqualified</option>
            </select>
          </div>

          {/* Schedule Next Follow-up Option */}
          <div className="pt-2 border-t border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => {
                  setScheduleNext(e.target.checked);
                  if (e.target.checked && !nextDate) {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setNextDate(d.toISOString().split('T')[0]);
                  }
                }}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-zinc-200 focus:ring-0"
              />
              <span className="text-xs font-medium text-zinc-300">
                Schedule next follow-up right now
              </span>
            </label>

            {scheduleNext && (
              <div className="mt-3 p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Next Follow-Up Date *
                    </label>
                    <input
                      type="date"
                      required={scheduleNext}
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Action Type
                    </label>
                    <select
                      value={nextActionType}
                      onChange={(e) => setNextActionType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-500"
                    >
                      <option value="call">📞 Phone Call</option>
                      <option value="email">✉️ Email</option>
                      <option value="linkedin">💼 LinkedIn</option>
                      <option value="meeting">🤝 Meeting</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Next Action Agenda
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Check in on email pitch, demo discussion"
                    value={nextNotes}
                    onChange={(e) => setNextNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-200 text-zinc-950 transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save Outreach Activity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
