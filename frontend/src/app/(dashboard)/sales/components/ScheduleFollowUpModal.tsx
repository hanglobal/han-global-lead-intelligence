'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface ScheduleFollowUpModalProps {
  lead: {
    id: number;
    lid?: string;
    company_name: string;
    follow_up_date?: string | null;
    follow_up_time?: string | null;
    follow_up_action_type?: string | null;
    follow_up_priority?: string | null;
    follow_up_notes?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedLead: any) => void;
}

export default function ScheduleFollowUpModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: ScheduleFollowUpModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [actionType, setActionType] = useState('call');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      if (lead.follow_up_date) {
        setDate(lead.follow_up_date);
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split('T')[0]);
      }
      setTime(lead.follow_up_time || '10:00 AM');
      setActionType(lead.follow_up_action_type || 'call');
      setPriority(lead.follow_up_priority || 'medium');
      setNotes(lead.follow_up_notes || '');
      setError(null);
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const setShortcutDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Please choose a follow-up date');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await axios.post(`/api/crm/leads/${lead.id}/schedule-followup/`, {
        follow_up_date: date,
        follow_up_time: time,
        follow_up_action_type: actionType,
        follow_up_priority: priority,
        follow_up_notes: notes,
      });

      onSuccess(res.data.lead || res.data);
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule follow-up:', err);
      setError(err.response?.data?.error || 'Failed to schedule follow-up');
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
        className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              Schedule Follow-Up
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">
              {lead.company_name} {lead.lid ? `(${lead.lid})` : ''}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-zinc-200">
              {error}
            </div>
          )}

          {/* Date Picker & Shortcuts */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Follow-Up Date <span className="text-zinc-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {/* Quick shortcuts */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShortcutDate(0)}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(1)}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(2)}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                In 2 Days
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(3)}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                In 3 Days
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(7)}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Next Week
              </button>
            </div>
          </div>

          {/* Time & Action Type Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Preferred Time
              </label>
              <input
                type="text"
                placeholder="e.g. 10:30 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Action Type
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="call">📞 Phone Call</option>
                <option value="email">✉️ Email Outreach</option>
                <option value="linkedin">💼 LinkedIn Message</option>
                <option value="meeting">🤝 Meeting / Demo</option>
                <option value="other">📌 Other Action</option>
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  priority === 'high'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                High
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  priority === 'medium'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  priority === 'low'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-semibold shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Low
              </button>
            </div>
          </div>

          {/* Agenda / Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Follow-Up Agenda & Instructions
            </label>
            <textarea
              rows={3}
              placeholder="What needs to be done? e.g. Follow up on proposal sent, discuss enterprise pricing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
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
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Set Follow-Up
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
