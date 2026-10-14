'use client';

export type SalesBucketType = 'send_today' | 'follow_up_today' | 'meetings' | 'needs_research';

interface SalesMetricsProps {
  overview: {
    due_today?: number;
    overdue?: number;
    upcoming?: number;
    completed_today?: number;
    hot_uncontacted?: number;
    total_uncontacted?: number;
    contacted_this_week?: number;
    pipeline?: Record<string, number>;
    buckets?: {
      send_today: number;
      follow_up_today: number;
      meetings: number;
      needs_research: number;
    };
    send_today_count?: number;
    follow_up_today_count?: number;
    meetings_count?: number;
    needs_research_count?: number;
  } | null;
  loading: boolean;
  activeBucket: SalesBucketType;
  onBucketChange: (bucket: SalesBucketType) => void;
}

export default function SalesMetrics({ overview, loading, activeBucket, onBucketChange }: SalesMetricsProps) {
  const o = overview || {};
  const buckets = o.buckets || {
    send_today: o.send_today_count ?? 0,
    follow_up_today: o.follow_up_today_count ?? 0,
    meetings: o.meetings_count ?? 0,
    needs_research: o.needs_research_count ?? 0,
  };

  const overdueCount = o.overdue ?? 0;
  const dueTodayCount = o.due_today ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. SEND TODAY */}
      <div
        id="bucket-send-today"
        onClick={() => onBucketChange('send_today')}
        className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer relative ${
          activeBucket === 'send_today'
            ? 'bg-zinc-800/70 border-zinc-600/90 shadow-md ring-1 ring-zinc-500/20'
            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-850/50 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium uppercase tracking-wider ${activeBucket === 'send_today' ? 'text-zinc-200' : 'text-zinc-400'}`}>
            Send Today
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
            Verified
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : buckets.send_today}
          </span>
          <span className="text-xs text-zinc-500">accounts</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 truncate">
          Contact-ready leads with verified emails
        </p>
      </div>

      {/* 2. FOLLOW UP TODAY */}
      <div
        id="bucket-followup-today"
        onClick={() => onBucketChange('follow_up_today')}
        className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer relative ${
          activeBucket === 'follow_up_today'
            ? 'bg-zinc-800/70 border-zinc-600/90 shadow-md ring-1 ring-zinc-500/20'
            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-850/50 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium uppercase tracking-wider ${activeBucket === 'follow_up_today' ? 'text-zinc-200' : 'text-zinc-400'}`}>
            Follow Up Today
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
            overdueCount > 0 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
          }`}>
            {overdueCount > 0 ? `${overdueCount} Overdue` : 'Due Today'}
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : buckets.follow_up_today}
          </span>
          <span className="text-xs text-zinc-500">
            {overdueCount > 0 ? `(${dueTodayCount} due, ${overdueCount} overdue)` : 'tasks'}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 truncate">
          {overdueCount > 0 ? 'Requires attention today' : 'Scheduled touches for today'}
        </p>
      </div>

      {/* 3. MEETINGS / OPPORTUNITIES */}
      <div
        id="bucket-meetings"
        onClick={() => onBucketChange('meetings')}
        className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer relative ${
          activeBucket === 'meetings'
            ? 'bg-zinc-800/70 border-zinc-600/90 shadow-md ring-1 ring-zinc-500/20'
            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-850/50 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium uppercase tracking-wider ${activeBucket === 'meetings' ? 'text-zinc-200' : 'text-zinc-400'}`}>
            Meetings & Deals
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
            In Flight
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : buckets.meetings}
          </span>
          <span className="text-xs text-zinc-500">conversations</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 truncate">
          Booked meetings, proposals & discussions
        </p>
      </div>

      {/* 4. NEEDS RESEARCH */}
      <div
        id="bucket-needs-research"
        onClick={() => onBucketChange('needs_research')}
        className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer relative ${
          activeBucket === 'needs_research'
            ? 'bg-zinc-800/70 border-zinc-600/90 shadow-md ring-1 ring-zinc-500/20'
            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-850/50 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-medium uppercase tracking-wider ${activeBucket === 'needs_research' ? 'text-zinc-200' : 'text-zinc-400'}`}>
            Needs Research
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
            Missing Contact
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : buckets.needs_research}
          </span>
          <span className="text-xs text-zinc-500">prospects</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 truncate">
          Strong accounts missing verified email or DM
        </p>
      </div>
    </div>
  );
}
