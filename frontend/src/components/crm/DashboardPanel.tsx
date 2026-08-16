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
  stage?: string;
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
  firecrawl_raw_data?: any;
  insight?: any;
  email_drafts?: any[];
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

const STAGE_COLORS: Record<string, string> = {
  'New': '#6366f1',
  'Basic Qualified': '#0ea5e9',
  'Web Scraped': '#10b981',
  'AI Insights': '#8b5cf6',
  'Templates Generated': '#ec4899',
  'Unqualified': '#ef4444',
};

const STAGE_ORDER = ['New', 'Basic Qualified', 'Web Scraped', 'AI Insights', 'Templates Generated'];

const getLeadStage = (l: Lead) => {
  if (l.email_drafts && l.email_drafts.length > 0) return 'Templates Generated';
  if (l.insight) return 'AI Insights';
  if (l.firecrawl_raw_data) return 'Web Scraped';
  
  if (l.status === 'unqualified') {
     if (l.stage === 'ai_qualification') return 'Basic Qualified';
     if (l.stage === 'basic_qualification') return 'New';
     return 'New';
  }
  
  if (l.status === 'qualified') return 'Basic Qualified';
  
  return 'New';
};

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

const RadialProgress = ({ percentage, color, label, icon }: { percentage: number, color: string, label: string, icon: React.ReactNode }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="transparent" stroke="#27272a" strokeWidth="6" />
          <circle cx="40" cy="40" r={radius} fill="transparent" stroke={color} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute flex items-center justify-center inset-0 flex-col">
          <span className="text-xs font-bold text-white">{percentage}%</span>
        </div>
      </div>
      <div className="text-center flex flex-col items-center">
        <div className="text-zinc-500 mb-1">{icon}</div>
        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider text-center">{label}</span>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs z-50 relative">
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
  const withWebsite = filteredLeads.filter(l => l.website).length;
  const withSocial = filteredLeads.filter(l => l.facebook_url || l.twitter_url || l.instagram_url || l.linkedin_url).length;
  
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const aiEnrichedLeads = filteredLeads.filter(l => !!l.insight).length;
  const activeCampaigns = campaigns.filter(c => c.status === 'running').length;

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

  // --- AI Keyword Cloud Simulator ---
  const insightKeywords = useMemo(() => {
    const words: Record<string, number> = {};
    filteredLeads.forEach(l => {
      if (l.insight && typeof l.insight === 'object') {
        const text = JSON.stringify(l.insight).toLowerCase();
        const matches = text.match(/\b[a-z]{5,}\b/g) || [];
        matches.forEach(w => {
          if (['false','true','null','https','http','email','phone','name','value','description','details','category','location','address','website','company'].includes(w)) return;
          words[w] = (words[w] || 0) + 1;
        });
      }
    });
    return Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([text, weight]) => ({ text, weight }));
  }, [filteredLeads]);

  // --- Real-time Activity Feed ---
  const recentActivity = useMemo(() => {
    return [...leads]
      .filter(l => l.created_at)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 5);
  }, [leads]);

  // --- Pie chart distribution ---
  const donutData = useMemo(() => {
    const newLeads = filteredLeads.filter(l => l.status === 'new').length;
    return [
      { name: 'Qualified', value: qualifiedLeads, color: '#10b981' },
      { name: 'Unqualified', value: unqualifiedLeads, color: '#ef4444' },
      ...(newLeads > 0 ? [{ name: 'New', value: newLeads, color: '#6366f1' }] : [])
    ].filter(d => d.value > 0);
  }, [qualifiedLeads, unqualifiedLeads, filteredLeads]);

  // --- Funnel conversion ---
  const funnelConversion = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    STAGE_ORDER.forEach(s => { stageCounts[s] = 0; });

    filteredLeads.forEach(l => {
      const st = getLeadStage(l);
      const stageIndex = STAGE_ORDER.indexOf(st);
      if (stageIndex >= 0) {
        for (let i = 0; i <= stageIndex; i++) {
          stageCounts[STAGE_ORDER[i]]++;
        }
      }
    });

    return STAGE_ORDER.map((s, index) => {
      const entered = stageCounts[s];
      const passedForward = index < STAGE_ORDER.length - 1 ? stageCounts[STAGE_ORDER[index + 1]] : 0;
      const currentHere = entered - passedForward;
      const conversion = entered > 0 ? Math.round((passedForward / entered) * 100) : 0;
      const nextColor = index < STAGE_ORDER.length - 1 ? STAGE_COLORS[STAGE_ORDER[index + 1]] : s === 'Templates Generated' ? STAGE_COLORS['Templates Generated'] : '#10b981';
      
      return {
        stage: s,
        current: currentHere,
        passedForward,
        totalEntered: entered,
        conversion,
        color: STAGE_COLORS[s],
        nextColor
      };
    });
  }, [filteredLeads]);

  const topCampaigns = useMemo(() => {
    return campaigns.map(c => {
      const cLeads = filteredLeads.filter(l => l.campaign_id === `CID-${c.id}`);
      const leadsWithScore = cLeads.filter(l => l.score != null);
      const avgScore = leadsWithScore.length > 0 
        ? Math.round(leadsWithScore.reduce((sum, l) => sum + (l.score || 0), 0) / leadsWithScore.length)
        : 0;
      
      const qualified = cLeads.filter(l => l.status === 'qualified').length;
      const convRate = cLeads.length > 0 ? Math.round((qualified / cLeads.length) * 100) : 0;
      
      return {
        ...c,
        avgScore,
        convRate,
        trackedLeads: cLeads.length
      };
    })
    .sort((a, b) => (b.avgScore + b.convRate) - (a.avgScore + a.convRate) || (b.trackedLeads - a.trackedLeads))
    .slice(0, 5);
  }, [campaigns, filteredLeads]);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Common styles
  const cardStyle = "bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]";
  const panelStyle = "bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight"><span suppressHydrationWarning>{Greeting()}</span>,{` `}{totalLeads > 0 ? `${totalLeads} leads in pipeline` : 'welcome back'}</h1>
          <p className="text-sm text-zinc-400 mt-1" suppressHydrationWarning>{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900/50 backdrop-blur border border-white/5 rounded-xl p-1 shadow-inner">
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${range === r ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards (8 Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Leads */}
        <div className={cardStyle}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Leads</span>
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{totalLeads.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-2">
              <Trend current={totalLeads} previous={prevTotalLeads} />
              <span className="text-[10px] text-zinc-600 font-medium">vs prior period</span>
            </div>
          </div>
        </div>

        {/* 2. Conversion Rate */}
        <div className={cardStyle}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Conversion</span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{conversionRate}%</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-2">{qualifiedLeads} leads successfully qualified</p>
          </div>
        </div>

        {/* 3. Avg Score */}
        <div className={cardStyle}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avg Score</span>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{avgScore}</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-2">{highScoreLeads} hot leads (score ≥ 70)</p>
          </div>
        </div>

        {/* 4. Data Quality */}
        <div className={cardStyle}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact Info</span>
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{totalLeads > 0 ? Math.round((withEmail + withPhone) / (totalLeads * 2) * 100) : 0}%</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-2">{withEmail} emails · {withPhone} phones</p>
          </div>
        </div>

        {/* 5. Qualified Leads */}
        <div className={cardStyle}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Qualified</span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{qualifiedLeads}</p>
          </div>
        </div>

        {/* 6. Unqualified Leads */}
        <div className={cardStyle}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unqualified</span>
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{unqualifiedLeads}</p>
          </div>
        </div>

        {/* 7. AI Enrichment */}
        <div className={cardStyle}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">AI Enrichment</span>
              <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{aiEnrichedLeads}</p>
          </div>
        </div>

        {/* 8. Active Campaigns */}
        <div className={cardStyle}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Scrapers</span>
              <div className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{activeCampaigns}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Pipeline Funnel & Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${panelStyle}`}>
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
          <div className="mb-6 relative z-10">
            <p className="text-lg font-bold text-white tracking-tight">Pipeline Velocity</p>
            <p className="text-sm text-zinc-400 mt-1">Lead progression through AI enrichment stages</p>
          </div>
          <div className="space-y-4 relative z-10">
            {funnelConversion.map((s, idx) => {
              const isLast = idx === funnelConversion.length - 1;
              return (
                <div key={s.stage} className="bg-zinc-950/40 p-4 rounded-xl border border-white/5 shadow-inner flex flex-col md:flex-row items-center gap-6 hover:bg-zinc-950/60 transition-colors">
                  <div className="flex items-center justify-between w-full md:w-[22%]">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full flex-none shadow-[0_0_12px_rgba(0,0,0,0.5)]" style={{ backgroundColor: s.color, boxShadow: `0 0 12px ${s.color}60` }} />
                      <span className="text-sm font-semibold text-zinc-100 truncate">{s.stage}</span>
                    </div>
                  </div>
                  <div className="w-full md:flex-1 h-3.5 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800/80 shadow-inner">
                    {s.totalEntered > 0 && (
                      <>
                        <div className="h-full transition-all duration-700 relative overflow-hidden" style={{ width: `${(s.passedForward / s.totalEntered) * 100}%`, backgroundColor: s.nextColor }} title="Passed to Next Stage">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full animate-[shimmer_2s_infinite]" />
                        </div>
                        <div className="h-full transition-all duration-700 opacity-60" style={{ backgroundColor: s.color, width: `${(s.current / s.totalEntered) * 100}%` }} title={`Stalled in ${s.stage}`} />
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto gap-5 mt-4 md:mt-0">
                    <div className="text-center md:text-right w-12">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-semibold">Entered</p>
                      <p className="text-base font-bold text-white tabular-nums">{s.totalEntered}</p>
                    </div>
                    <div className="text-center md:text-right w-12">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-semibold">Stalled</p>
                      <p className="text-base font-bold text-zinc-400 tabular-nums">{s.current}</p>
                    </div>
                    <div className="text-center md:text-right w-12">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-semibold">Passed</p>
                      <p className="text-base font-bold text-white tabular-nums" style={{ color: s.nextColor }}>{isLast ? '-' : s.passedForward}</p>
                    </div>
                    <div className="text-center md:text-right w-16 hidden md:block">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-semibold">Conv.</p>
                      <p className="text-sm font-bold tabular-nums px-2 py-0.5 rounded inline-block border" style={{ color: s.nextColor, borderColor: `${s.nextColor}40`, backgroundColor: `${s.nextColor}10` }}>
                        {isLast ? '-' : `${s.conversion}%`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${panelStyle} flex flex-col`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
          <div className="mb-4 relative z-10 text-center flex-none">
            <p className="text-lg font-bold text-white tracking-tight">Pipeline Distribution</p>
            <p className="text-sm text-zinc-400 mt-1">Status of all scanned leads</p>
          </div>
          <div className="relative z-10 flex-1 min-h-[250px]">
            {donutData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No data in period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={4} dataKey="value" nameKey="name" cornerRadius={4}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Live Feed, Word Cloud, Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Quality */}
        <div className={panelStyle}>
          <div className="mb-5">
            <p className="text-sm font-bold text-white tracking-tight">Lead Quality Data</p>
            <p className="text-xs text-zinc-500 mt-1">Availability of contact information</p>
          </div>
          <div className="grid grid-cols-2 gap-y-8 gap-x-2 mt-6">
            <RadialProgress 
              percentage={totalLeads > 0 ? Math.round((withPhone / totalLeads) * 100) : 0} 
              color="#3b82f6" 
              label="Phone Numbers" 
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
            />
            <RadialProgress 
              percentage={totalLeads > 0 ? Math.round((withEmail / totalLeads) * 100) : 0} 
              color="#10b981" 
              label="Email Addresses" 
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            />
            <RadialProgress 
              percentage={totalLeads > 0 ? Math.round((withWebsite / totalLeads) * 100) : 0} 
              color="#f59e0b" 
              label="Websites" 
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
            />
            <RadialProgress 
              percentage={totalLeads > 0 ? Math.round((withSocial / totalLeads) * 100) : 0} 
              color="#ec4899" 
              label="Social Profiles" 
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
            />
          </div>
        </div>

        {/* Top Campaigns */}
        <div className={panelStyle}>
          <div className="mb-5 flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-white tracking-tight">Top Campaigns</p>
              <p className="text-xs text-zinc-500 mt-1">Ranked by highest lead score</p>
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Quality</div>
          </div>
          {topCampaigns.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">No campaigns run yet</div>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-zinc-950/50 rounded-lg border border-white/5 shadow-inner">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">{c.status} • {c.trackedLeads} tracked leads</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-emerald-400">{c.convRate}%</span>
                      <span className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider">Conv</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-amber-400">{c.avgScore}</span>
                      <span className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider">Avg Score</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Categories */}
        <div className={panelStyle}>
          <div className="mb-5">
            <p className="text-sm font-bold text-white tracking-tight">Top Market Categories</p>
            <p className="text-xs text-zinc-500 mt-1">Most active prospect segments</p>
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
                  <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" style={{ width: `${(c.value / totalLeads) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Leads Over Time */}
      <div className="pb-8">
        <div className={panelStyle}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-bold text-white tracking-tight">Acquisition Velocity</p>
              <p className="text-sm text-zinc-400 mt-1">Leads scraped over time in the last {RANGE_LABELS[range].toLowerCase()}</p>
            </div>
            <span className="text-xs text-zinc-500 font-mono bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">{totalLeads} total</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={leadsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Leads" stroke="#8b5cf6" strokeWidth={3} fill="url(#leadGrad)" dot={false} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Required for shimmer animation to work correctly without global css */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
          0% { transform: translateX(-100%); }
        }
      `}} />
    </div>
  );
}
