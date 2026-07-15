'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Lead {
  id: number;
  name?: string;
  status: string;
  score?: number | null;
  source?: string;
  created_at?: string;
  campaign_id?: string;
  company_email?: string;
  company_phone?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  website?: string;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
}

interface Campaign {
  id: number;
  status: string;
  total_leads_found?: number;
  created_at: string;
  name: string;
}

type Range = '24h' | '7d' | '30d' | '90d';

const RANGE_LABELS: Record<Range, string> = {
  '24h': '24 Hours', '7d': '7 Days', '30d': '30 Days', '90d': '90 Days',
};

const RANGE_DAYS: Record<Range, number> = {
  '24h': 1, '7d': 7, '30d': 30, '90d': 90,
};

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1', qualified: '#10b981', unqualified: '#ef4444',
};

const STATUS_ORDER = ['new', 'qualified', 'unqualified'];

function Greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Trend({ current, previous, suffix }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0) return <span className="text-xs text-zinc-600">—</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
      </svg>
      {Math.abs(pct)}%{suffix}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPanel() {
  const [range, setRange] = useState<Range>('7d');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    axios.get('/api/crm/leads/')
      .then(r => setLeads(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios.get('/api/lead-hunter/campaigns/')
      .then(r => setCampaigns(r.data || []))
      .catch(() => {});
  }, []);

  const now = useMemo(() => new Date(), []);

  const cutoff = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d;
  }, [range, now]);

  const prevCutoff = useMemo(() => {
    const d = new Date(cutoff);
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d;
  }, [cutoff, range]);

  const prevLeads = useMemo(() =>
    leads.filter(l => l.created_at && new Date(l.created_at) >= prevCutoff && new Date(l.created_at) < cutoff),
    [leads, cutoff, prevCutoff]
  );

  const filteredLeads = useMemo(() =>
    leads.filter(l => l.created_at && new Date(l.created_at) >= cutoff),
    [leads, cutoff]
  );



  // --- KPIs ---
  const totalLeads = filteredLeads.length;
  const prevTotalLeads = prevLeads.length;
  const qualifiedLeads = filteredLeads.filter(l => l.status === 'qualified').length;
  const unqualifiedLeads = filteredLeads.filter(l => l.status === 'unqualified').length;
  const scoredLeads = filteredLeads.filter(l => l.score != null);
  const avgScore = scoredLeads.length ? Math.round(scoredLeads.reduce((s, l) => s + (l.score || 0), 0) / scoredLeads.length) : 0;
  const highScoreLeads = filteredLeads.filter(l => (l.score || 0) >= 70).length;
  const withEmail = filteredLeads.filter(l => l.company_email).length;
  const withPhone = filteredLeads.filter(l => l.company_phone).length;

  // --- Top categories ---
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      if (l.category) counts[l.category] = (counts[l.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);



  // --- Leads over time chart ---
  const leadsOverTime = useMemo(() => {
    const buckets: Record<string, number> = {};
    if (range === '24h') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(d.getHours() - i);
        const key = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        buckets[key] = 0;
      }
      filteredLeads.forEach(l => {
        if (!l.created_at) return;
        const ld = new Date(l.created_at);
        if (now.getTime() - ld.getTime() <= 24 * 60 * 60 * 1000) {
          const key = ld.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
          if (key in buckets) buckets[key]++;
        }
      });
    } else {
      const days = RANGE_DAYS[range];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets[key] = 0;
      }
      filteredLeads.forEach(l => {
        if (!l.created_at) return;
        const key = new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (key in buckets) buckets[key]++;
      });
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }, [filteredLeads, range, now]);

  // --- Status distribution for donut ---
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach(s => { counts[s] = 0; });
    filteredLeads.forEach(l => { if (l.status in counts) counts[l.status]++; });
    return STATUS_ORDER.map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: counts[s], color: STATUS_COLORS[s] })).filter(d => d.value > 0);
  }, [filteredLeads]);

  // --- Score distribution ---
  const scoreData = useMemo(() => {
    const buckets = [
      { range: '0-19', count: 0, color: '#ef4444' },
      { range: '20-39', count: 0, color: '#f97316' },
      { range: '40-59', count: 0, color: '#f59e0b' },
      { range: '60-79', count: 0, color: '#06b6d4' },
      { range: '80-100', count: 0, color: '#10b981' },
    ];
    filteredLeads.forEach(l => {
      const s = l.score ?? 0;
      if (s < 20) buckets[0].count++;
      else if (s < 40) buckets[1].count++;
      else if (s < 60) buckets[2].count++;
      else if (s < 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [filteredLeads]);

  // --- Funnel conversion ---
  const funnelConversion = useMemo(() => {
    const activeStages = STATUS_ORDER;
    const stageData = activeStages.map(s => ({
      stage: s.charAt(0).toUpperCase() + s.slice(1),
      current: filteredLeads.filter(l => l.status === s).length,
      color: STATUS_COLORS[s],
      passedForward: 0,
      totalEntered: 0,
      conversion: 0
    }));

    for (let i = 0; i < stageData.length; i++) {
      let passed = 0;
      // 'Qualified' and 'Unqualified' are terminal stages. New passes to them.
      if (stageData[i].stage === 'New') {
        passed = stageData.find(st => st.stage === 'Qualified')?.current || 0;
      }
      stageData[i].passedForward = passed;
      stageData[i].totalEntered = stageData[i].current + passed;
      stageData[i].conversion = stageData[i].totalEntered > 0 ? Math.round((passed / stageData[i].totalEntered) * 100) : 0;
    }
    return stageData;
  }, [filteredLeads]);



  const coverageData = useMemo(() => [
    { name: 'Email', value: withEmail, color: '#3b82f6' },
    { name: 'Phone', value: withPhone, color: '#10b981' },
    { name: 'Website', value: filteredLeads.filter(l => l.website).length, color: '#8b5cf6' },
    { name: 'Social', value: filteredLeads.filter(l => l.facebook_url || l.twitter_url || l.instagram_url || l.linkedin_url).length, color: '#ec4899' },
  ], [withEmail, withPhone, filteredLeads]);

  const topCampaigns = useMemo(() => 
    [...campaigns].sort((a, b) => (b.total_leads_found || 0) - (a.total_leads_found || 0)).slice(0, 5),
  [campaigns]);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white"><span suppressHydrationWarning>{Greeting()}</span>,{` `}{totalLeads > 0 ? `${totalLeads} leads in pipeline` : 'welcome back'}</h1>
          <p className="text-sm text-zinc-500 mt-0.5" suppressHydrationWarning>{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${range === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{totalLeads.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1">
            <Trend current={totalLeads} previous={prevTotalLeads} />
            <span className="text-xs text-zinc-600">vs previous period</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Avg Score</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{avgScore}</p>
          <p className="text-xs text-zinc-500 mt-1">{highScoreLeads} leads with score ≥ 70</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Qualified Leads</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{qualifiedLeads}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unqualified Leads</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{unqualifiedLeads}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Data Quality</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{totalLeads > 0 ? Math.round((withEmail + withPhone) / (totalLeads * 2) * 100) : 0}%</p>
          <p className="text-xs text-zinc-500 mt-1">{withEmail} with email · {withPhone} with company phone</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads Over Time */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Leads Over Time</p>
              <p className="text-xs text-zinc-500">New leads per day in the last {RANGE_LABELS[range].toLowerCase()}</p>
            </div>
            <span className="text-xs text-zinc-600 font-mono">{totalLeads} total</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={leadsOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Leads" stroke="#6366f1" strokeWidth={2} fill="url(#leadGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">Pipeline Distribution</p>
            <p className="text-xs text-zinc-500">Leads by current stage</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-zinc-600 text-sm">No data in period</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                  paddingAngle={2} dataKey="value" nameKey="name">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Funnel & Conversion */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">Pipeline Velocity & Conversion</p>
            <p className="text-xs text-zinc-500">Lead volume and drop-off rates across stages</p>
          </div>
          <div className="space-y-3">
            {funnelConversion.map((s) => (
              <div key={s.stage} className="bg-zinc-950/50 p-3.5 rounded-lg border border-zinc-800/50 flex flex-col md:flex-row items-center gap-4">
                {/* Stage Name & Conversion Badge */}
                <div className="flex items-center justify-between w-full md:w-[15%]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-semibold text-white truncate">{s.stage}</span>
                  </div>
                  {s.stage === 'New' && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded md:hidden">
                      {s.conversion}% conv.
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full md:flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                  {s.totalEntered > 0 && s.stage === 'New' && (
                    <>
                      <div className="h-full transition-all duration-500 bg-emerald-500" style={{ width: `${(s.passedForward / s.totalEntered) * 100}%` }} title="Passed to Qualified" />
                      <div className="h-full transition-all duration-500" style={{ backgroundColor: s.color, width: `${(s.current / s.totalEntered) * 100}%` }} title="Still New" />
                    </>
                  )}
                  {s.totalEntered > 0 && s.stage !== 'New' && (
                    <div className="h-full transition-all duration-500" style={{ backgroundColor: s.color, width: '100%' }} title={s.stage} />
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between w-full md:w-auto gap-4 mt-2 md:mt-0">
                  <div className="text-center md:text-right w-14">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Total</p>
                    <p className="text-sm font-bold text-white tabular-nums">{s.totalEntered}</p>
                  </div>
                  <div className="text-center md:text-right w-14">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Here</p>
                    <p className="text-sm font-bold text-zinc-300 tabular-nums">{s.current}</p>
                  </div>
                  <div className="text-center md:text-right w-14">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Passed</p>
                    <p className="text-sm font-bold text-emerald-400 tabular-nums">{s.stage !== 'New' ? '-' : s.passedForward}</p>
                  </div>
                  <div className="text-center md:text-right w-12 hidden md:block">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Conv.</p>
                    <p className="text-sm font-bold text-emerald-400 tabular-nums">{s.stage !== 'New' ? '-' : `${s.conversion}%`}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
          <div className="mb-4 flex-none">
            <p className="text-sm font-semibold text-white">Lead Quality Score</p>
            <p className="text-xs text-zinc-500">Distribution of scored leads</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                  {scoreData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
        {/* Top Categories */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="mb-5">
            <p className="text-sm font-semibold text-white">Top Categories</p>
            <p className="text-xs text-zinc-500">Most active market segments</p>
          </div>
          {topCategories.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">No data available</div>
          ) : (
            <div className="space-y-4">
              {topCategories.map((c) => (
                <div key={c.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium truncate pr-4">{c.name}</span>
                    <span className="text-zinc-400 tabular-nums">{c.value}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${(c.value / totalLeads) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enrichment Coverage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="mb-5">
            <p className="text-sm font-semibold text-white">Data Enrichment</p>
            <p className="text-xs text-zinc-500">Contactability coverage across pipeline</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {coverageData.map((d) => {
              const percent = totalLeads > 0 ? Math.round((d.value / totalLeads) * 100) : 0;
              return (
                <div key={d.name} className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                  <div className="relative w-12 h-12 flex items-center justify-center mb-2">
                    <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                      <circle cx="24" cy="24" r="20" stroke="#27272a" strokeWidth="4" fill="none" />
                      <circle cx="24" cy="24" r="20" stroke={d.color} strokeWidth="4" fill="none" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * percent) / 100} className="transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="text-xs font-bold text-white relative z-10">{percent}%</span>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">{d.name}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">{d.value} leads</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="mb-5 flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-white">Top Campaigns</p>
              <p className="text-xs text-zinc-500">By total leads acquired</p>
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Performance</div>
          </div>
          {topCampaigns.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">No campaigns run yet</div>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 capitalize">{c.status}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-emerald-400">{c.total_leads_found || 0}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">Leads</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
