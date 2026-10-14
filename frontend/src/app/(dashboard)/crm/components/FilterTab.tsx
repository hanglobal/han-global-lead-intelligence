'use client';

import { useState } from 'react';

interface FilterTabProps {
  isOpen: boolean;
  categories: string[];
  campaigns?: string[];
  statusFilter: Set<string>;
  categoryFilter: Set<string>;
  campaignFilter: Set<string>;
  leadIdFilter: Set<string>;
  ratingMin: number | '';
  ratingMax: number | '';
  reviewMin: number | '';
  reviewMax: number | '';
  hasEmail: boolean;
  hasPhone: boolean;
  scoreMin: number | '';
  scoreMax: number | '';
  dateFrom: string;
  dateTo: string;
  hasActiveFilters: boolean;
  onToggleStatus: (status: string) => void;
  onToggleCategory: (category: string) => void;
  onToggleCampaign: (campaign: string) => void;
  onToggleLeadId: (lid: string) => void;
  onRatingMinChange: (val: number | '') => void;
  onRatingMaxChange: (val: number | '') => void;
  onReviewMinChange: (val: number | '') => void;
  onReviewMaxChange: (val: number | '') => void;
  onHasEmailChange: (val: boolean) => void;
  onHasPhoneChange: (val: boolean) => void;
  onScoreMinChange: (val: number | '') => void;
  onScoreMaxChange: (val: number | '') => void;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onClearAll: () => void;
}

function formatCampaignId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return `CID-${digits}`;
}

function formatLeadId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return `LID-${digits}`;
}

const getPresetDates = (preset: 'today' | '7days' | '30days' | 'this_month') => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (preset === 'today') {
    return { from: todayStr, to: todayStr };
  } else if (preset === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const fromStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: fromStr, to: todayStr };
  } else if (preset === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const fromStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: fromStr, to: todayStr };
  } else if (preset === 'this_month') {
    const fromStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    return { from: fromStr, to: todayStr };
  }
  return { from: '', to: '' };
};

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
];

function Section({
  label, open, onToggle, children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left group mb-2"
      >
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-2 animate-slide-up">{children}</div>}
    </div>
  );
}

export default function FilterTab({
  isOpen, categories, campaigns, statusFilter, categoryFilter, campaignFilter, leadIdFilter,
  ratingMin, ratingMax, reviewMin, reviewMax,
  hasEmail, hasPhone, scoreMin, scoreMax,
  dateFrom, dateTo,
  hasActiveFilters, onToggleStatus, onToggleCategory, onToggleCampaign, onToggleLeadId,
  onRatingMinChange, onRatingMaxChange, onReviewMinChange, onReviewMaxChange,
  onHasEmailChange, onHasPhoneChange, onScoreMinChange, onScoreMaxChange,
  onDateFromChange, onDateToChange,
  onClearAll,
}: FilterTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (section: string) => {
    const next = new Set(expanded);
    next.has(section) ? next.delete(section) : next.add(section);
    setExpanded(next);
  };

  if (!isOpen) return null;

  return (
    <div className="w-72 flex-none card overflow-hidden flex flex-col min-h-0 animate-fade-in">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">Filters</span>
        {hasActiveFilters && (
          <button onClick={onClearAll} className="text-xs text-zinc-500 hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Section label="Status" open={expanded.has('status')} onToggle={() => toggle('status')}>
          {STATUSES.map((s) => (
            <label key={s.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={statusFilter.has(s.value)}
                onChange={() => onToggleStatus(s.value)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400"
              />
              <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{s.label}</span>
            </label>
          ))}
        </Section>

        <Section label="Created Date" open={expanded.has('date') || !!dateFrom || !!dateTo} onToggle={() => toggle('date')}>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const p = getPresetDates('today');
                  onDateFromChange(p.from);
                  onDateToChange(p.to);
                }}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  dateFrom && dateFrom === dateTo && dateFrom === getPresetDates('today').from
                    ? 'bg-zinc-700 border-zinc-500 text-white font-medium shadow-sm'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = getPresetDates('7days');
                  onDateFromChange(p.from);
                  onDateToChange(p.to);
                }}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  dateFrom === getPresetDates('7days').from && dateTo === getPresetDates('7days').to
                    ? 'bg-zinc-700 border-zinc-500 text-white font-medium shadow-sm'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = getPresetDates('30days');
                  onDateFromChange(p.from);
                  onDateToChange(p.to);
                }}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  dateFrom === getPresetDates('30days').from && dateTo === getPresetDates('30days').to
                    ? 'bg-zinc-700 border-zinc-500 text-white font-medium shadow-sm'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = getPresetDates('this_month');
                  onDateFromChange(p.from);
                  onDateToChange(p.to);
                }}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  dateFrom === getPresetDates('this_month').from && dateTo === getPresetDates('this_month').to
                    ? 'bg-zinc-700 border-zinc-500 text-white font-medium shadow-sm'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                This Month
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-zinc-500 font-medium">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-zinc-500 font-medium">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all [color-scheme:dark]"
              />
            </div>

            {(dateFrom || dateTo) && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-400">
                  {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `From ${dateFrom}` : `Until ${dateTo}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onDateFromChange('');
                    onDateToChange('');
                  }}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  Reset date
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section label="Rating" open={expanded.has('rating')} onToggle={() => toggle('rating')}>
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={ratingMin} onChange={(e) => onRatingMinChange(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150" />
            <input type="number" placeholder="Max" value={ratingMax} onChange={(e) => onRatingMaxChange(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150" />
          </div>
        </Section>

        <Section label="Score" open={expanded.has('score')} onToggle={() => toggle('score')}>
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={scoreMin} onChange={(e) => onScoreMinChange(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150" />
            <input type="number" placeholder="Max" value={scoreMax} onChange={(e) => onScoreMaxChange(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150" />
          </div>
        </Section>

        <Section label="Campaign" open={expanded.has('campaign')} onToggle={() => toggle('campaign')}>
          <div className="space-y-2">
            {campaigns && campaigns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {campaigns.map((cid) => {
                  const active = campaignFilter.has(cid);
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => onToggleCampaign(cid)}
                      className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
                        active
                          ? 'bg-zinc-700 border-zinc-500 text-white font-medium shadow-sm'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {cid}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-sm text-zinc-500 font-mono">CID-</span>
              <input
                type="text"
                placeholder="1"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const input = e.currentTarget;
                  const cid = formatCampaignId(input.value);
                  if (cid && !campaignFilter.has(cid)) {
                    onToggleCampaign(cid);
                  }
                  input.value = '';
                }}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150"
              />
            </div>
            {campaignFilter.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(campaignFilter).map((cid) => (
                  <span
                    key={cid}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300"
                  >
                    {cid}
                    <button
                      onClick={() => onToggleCampaign(cid)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section label="Lead ID" open={expanded.has('leadId')} onToggle={() => toggle('leadId')}>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-zinc-500 font-mono">LID-</span>
              <input
                type="text"
                placeholder="1"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const input = e.currentTarget;
                  const lid = formatLeadId(input.value);
                  if (lid && !leadIdFilter.has(lid)) {
                    onToggleLeadId(lid);
                  }
                  input.value = '';
                }}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150"
              />
            </div>
            {leadIdFilter.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(leadIdFilter).map((lid) => (
                  <span
                    key={lid}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300"
                  >
                    {lid}
                    <button
                      onClick={() => onToggleLeadId(lid)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section label="Reviews" open={expanded.has('reviews')} onToggle={() => toggle('reviews')}>
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={reviewMin} onChange={(e) => onReviewMinChange(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150" />
            <input type="number" placeholder="Max" value={reviewMax} onChange={(e) => onReviewMaxChange(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all duration-150" />
          </div>
        </Section>

        <Section label="Contact Info" open={expanded.has('contact')} onToggle={() => toggle('contact')}>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasEmail}
              onChange={() => onHasEmailChange(!hasEmail)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400"
            />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Has email</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasPhone}
              onChange={() => onHasPhoneChange(!hasPhone)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400"
            />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Has company phone</span>
          </label>
        </Section>

        {categories.length > 0 && (
          <Section label="Category" open={expanded.has('category')} onToggle={() => toggle('category')}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={categoryFilter.has(cat)} onChange={() => onToggleCategory(cat)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400" />
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors truncate">{cat}</span>
                </label>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
