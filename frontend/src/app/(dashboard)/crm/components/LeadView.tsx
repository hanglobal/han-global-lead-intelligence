import axios from 'axios';
import { useState, useEffect } from 'react';
import ScheduleFollowUpModal from '@/app/(dashboard)/sales/components/ScheduleFollowUpModal';
import LogOutreachModal from '@/app/(dashboard)/sales/components/LogOutreachModal';
import { formatEasternDateTime } from '@/lib/dateUtils';

interface DecisionMaker {
  id?: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  headline?: string;
  seniority_level?: string;
  functional_level?: string;
  email?: string;
  personal_email?: string;
  mobile_number?: string;
  linkedin?: string;
  linkedin_profile?: any;
  linkedin_posts?: any[];
  city?: string;
  state?: string;
  country?: string;
  profile_image_url?: string;
  skills?: any;
  experience_history?: any;
  education_history?: any;
  about?: string;
}

interface Lead {
  id: number;
  lid?: string;
  place_id?: string;
  company_name: string;
  source?: string;
  linkedin_profile?: any;
  linkedin_posts?: any[];
  company_domain?: string;
  company_website?: string;
  company_phone?: string;
  company_linkedin?: string;
  industry?: string;
  company_size?: string;
  company_annual_revenue?: string;
  company_annual_revenue_clean?: string;
  company_total_funding?: string;
  company_total_funding_clean?: string;
  company_technologies?: string[];
  keywords?: string;
  company_description?: string;
  city?: string;
  state?: string;
  country?: string;
  company_street_address?: string;
  company_postal_code?: string;
  company_full_address?: string;
  company_email?: string;
  google_maps_url?: string;
  rating?: number;
  review_count?: number;
  price_level?: string | null;
  fid?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  notes?: string;
  tags?: string[];
  score?: number | null;
  score_label?: 'hot' | 'warm' | 'cold' | null;
  score_reasons?: string[];
  stage?: string | null;
  classification?: string | null;
  campaign_id?: string;
  source_campaign_id?: number | null;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  social_links?: Record<string, string>;
  crm_signals?: Record<string, any>;
  raw_data?: Record<string, any>;
  firecrawl_raw_data?: any[];
  ai_reasoning?: string | null;
  decision_maker?: DecisionMaker | null;
  company_people?: DecisionMaker[];
  insight?: {
    pain_points: string;
    operational_gap: string;
    opportunity: string;
  } | null;
  email_drafts?: {
    subject: string;
    body: string;
  }[];
  scraped_at?: string;
  created_at?: string;
  updated_at?: string;
  follow_up_date?: string | null;
  follow_up_time?: string | null;
  follow_up_status?: string | null;
  follow_up_priority?: string | null;
  follow_up_action_type?: string | null;
  follow_up_notes?: string | null;
  last_contacted_at?: string | null;
  notes_history?: {
    id: number;
    note: string;
    created_by: string;
    created_at: string;
  }[];
}

interface LeadActivity {
  id: number;
  activity_type: string;
  description: string;
  created_at: string;
}

interface LeadViewProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

const ALL_SECTIONS = ['company', 'decision_maker', 'linkedin_profile', 'linkedin_posts', 'ai_insights', 'pitch', 'notes'] as const;

function formatCleanLevel(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const v = val.trim();
  if (!v || v === '-') return null;
  const map: Record<string, string> = {
    c_suite: 'C-Suite',
    c_level: 'C-Suite',
    vp: 'VP',
    director: 'Director',
    manager: 'Manager',
    senior: 'Senior',
    lead: 'Lead',
    entry: 'Entry Level',
    owner: 'Owner',
    founder: 'Founder',
    partner: 'Partner',
    board_member: 'Board Member',
    executive: 'Executive',
    sales: 'Sales',
    marketing: 'Marketing',
    operations: 'Operations',
    finance: 'Finance',
    engineering: 'Engineering',
    human_resources: 'Human Resources',
    legal: 'Legal',
  };
  const lower = v.toLowerCase().replace(/[\s-]+/g, '_');
  if (map[lower]) return map[lower];
  return v
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatCleanMoney(val: any): string | null {
  if (val == null || val === '') return null;
  
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'null') return null;
    
    const matchSuffix = /[0-9.]+\s*([MBKTmbkt])/i.exec(trimmed);
    if (matchSuffix) {
      const numPart = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
      const suffix = matchSuffix[1].toUpperCase();
      if (!isNaN(numPart)) {
        return `$${numPart}${suffix}`;
      }
      return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
    }

    const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num) && num > 0) {
      if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}B`;
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
      return `$${num.toLocaleString()}`;
    }
    return trimmed;
  }
  
  if (typeof val === 'number') {
    if (val <= 0) return null;
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `$${val.toLocaleString()}`;
  }
  
  return String(val);
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  const isEmpty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-zinc-800/30 last:border-0 gap-4">
      <span className="text-xs text-zinc-500 flex-none w-32 mt-0.5">{label}</span>
      <span className="text-xs text-zinc-200 text-right break-words flex-1 max-w-[calc(100%-8.5rem)]">
        {isEmpty ? <span className="text-zinc-600">-</span> : value}
      </span>
    </div>
  );
}

function ContactRow({ label, value, type }: { label: string; value?: any; type: 'phone' | 'email' }) {
  const [open, setOpen] = useState(false);
  
  if (!value) {
    return (
      <div className="flex items-start justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
        <span className="text-xs text-zinc-500 flex-none w-32">{label}</span>
        <span className="text-xs text-zinc-600 text-right">-</span>
      </div>
    );
  }

  let items: string[] = [];
  if (Array.isArray(value)) {
    items = value.map(x => String(x).trim()).filter(Boolean);
  } else if (typeof value === 'string') {
    items = value.split(',').map(item => item.trim()).filter(Boolean);
  } else {
    items = [String(value).trim()];
  }

  if (items.length === 0) {
    return (
      <div className="flex items-start justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
        <span className="text-xs text-zinc-500 flex-none w-32">{label}</span>
        <span className="text-xs text-zinc-600 text-right">-</span>
      </div>
    );
  }

  const firstItem = items[0];
  const remainingCount = items.length - 1;

  const getHref = (item: string) => {
    return type === 'phone' ? `tel:${item.replace(/[^\d+]/g, '')}` : `mailto:${item}`;
  };

  return (
    <div className="flex items-start justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-32 mt-0.5">{label}</span>
      <div className="flex items-center gap-2 relative">
        <a href={getHref(firstItem)} className="text-xs font-mono text-zinc-200 hover:text-white hover:underline transition-colors break-all text-right">
          {firstItem}
        </a>
        
        {remainingCount > 0 && (
          <div className="relative">
            <button 
              type="button"
              onClick={() => setOpen(!open)}
              title={`View ${remainingCount} more`}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 text-[10px] font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none px-1 shadow-sm transition-colors cursor-pointer z-10"
            >
              +{remainingCount}
            </button>
            
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-max max-w-xs bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-fade-in text-left">
                  <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 border-b border-zinc-800 uppercase tracking-wider">
                    All {label}s
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {items.map((item, i) => (
                      <a 
                        key={i} 
                        href={getHref(item)} 
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors truncate"
                        title={item}
                      >
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TagListRow({ label, items }: { label: string; items?: any }) {
  const [open, setOpen] = useState(false);
  
  let list: string[] = [];
  if (Array.isArray(items)) {
    list = items.map(x => {
      if (typeof x === 'object' && x !== null) {
        return String(x.name || x.value || x.title || JSON.stringify(x)).trim();
      }
      return String(x).trim();
    }).filter(Boolean);
  } else if (typeof items === 'string' && items.trim().length > 0) {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) {
        list = parsed.map(x => String(x).trim()).filter(Boolean);
      } else {
        list = items.split(',').map(x => x.trim()).filter(Boolean);
      }
    } catch {
      list = items.split(',').map(x => x.trim()).filter(Boolean);
    }
  }

  if (!list || list.length === 0) {
    return <Row label={label} value={null} />;
  }

  const visibleItems = list.slice(0, 5);
  const remainingCount = list.length - 5;

  return (
    <div className="flex items-start justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-32 mt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap justify-end relative max-w-[calc(100%-8.5rem)]">
        {visibleItems.map((item, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
            {item}
          </span>
        ))}
        
        {remainingCount > 0 && (
          <div className="relative">
            <button 
              type="button"
              onClick={() => setOpen(!open)}
              title={`Click to view all ${list.length} ${label.toLowerCase()}`}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 text-[10px] font-medium h-[20px] flex items-center justify-center rounded leading-none px-1.5 transition-colors cursor-pointer z-10 ml-0.5"
            >
              +{remainingCount} more
            </button>
            
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-max max-w-[340px] bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-850/80">
                    <span className="text-xs font-semibold text-zinc-200 tracking-wider">
                      All {label} ({list.length})
                    </span>
                    <button 
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-zinc-750 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3 max-h-56 overflow-y-auto flex flex-wrap gap-1.5">
                    {list.map((item, i) => (
                      <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700/60 shadow-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CoordRow({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  if (lat == null && lng == null) {
    return <Row label="Coordinates" value={null} />;
  }
  const mapsUrl = lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-32">Coordinates</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-zinc-300">{lat?.toFixed(5)}, {lng?.toFixed(5)}</span>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-zinc-400 hover:text-white underline ml-1"
          >
            Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}

function renderAIReasoningBullets(text: string) {
  if (!text) return null;

  const rawParts = text.split(/(?=(?:^|\s)\d+\.\s+)/g).map(p => p.trim()).filter(Boolean);

  if (rawParts.length > 1) {
    return (
      <div className="space-y-2">
        {rawParts.map((part, idx) => {
          const cleanPart = part.replace(/^\d+\.\s+/, '');
          const match = cleanPart.match(/^([^:-]+(?::\s*(?:PASS|FAIL|UNQUALIFIED|QUALIFIED))?)\s*[:-]\s*([\s\S]+)$/i);
          
          if (match) {
            const title = match[1].trim();
            const desc = match[2].trim();
            const isPass = title.toUpperCase().includes('PASS') || title.toUpperCase().includes('QUALIFIED');
            const isFail = title.toUpperCase().includes('FAIL') || title.toUpperCase().includes('UNQUALIFIED');
            
            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300 py-1.5 border-b border-zinc-800/30 last:border-0">
                <span className={`flex-none mt-1.5 w-1.5 h-1.5 rounded-full ${isPass ? 'bg-emerald-400' : isFail ? 'bg-rose-400' : 'bg-zinc-400'}`} />
                <div className="space-y-0.5">
                  <span className={`font-semibold mr-1.5 ${isPass ? 'text-emerald-300' : isFail ? 'text-rose-300' : 'text-zinc-200'}`}>
                    {title}:
                  </span>
                  <span className="text-zinc-300">{desc}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300 py-1.5 border-b border-zinc-800/30 last:border-0">
              <span className="flex-none mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>{cleanPart}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return (
      <div className="space-y-1.5">
        {lines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300 py-1 border-b border-zinc-800/30 last:border-0">
            <span className="flex-none mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>{line.replace(/^[-•*]\s*/, '')}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{text}</p>;
}

/**
 * Clean, Non-Boxed Accordion Section Component
 * Soft natural dividers instead of harsh nested border cards
 * Professional SVG icon container
 */
function AccordionSection({
  id,
  title,
  subtitle,
  badge,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div id={`section-${id}`} className="border-b border-zinc-800/50 last:border-b-0 pb-4 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:opacity-90 transition-opacity focus:outline-none cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors flex-none">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white tracking-tight transition-colors">
                {title}
              </span>
              {badge}
            </div>
            {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <span className="text-[10px] text-zinc-500 hidden sm:inline-block font-medium">
            {isOpen ? 'Collapse' : 'Expand'}
          </span>
          <div className="w-5 h-5 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="pt-2 animate-slide-up space-y-3 pl-1 sm:pl-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function LeadView({ lead, isOpen, onClose }: LeadViewProps) {
  const [leadDetail, setLeadDetail] = useState<Lead | null>(lead);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Accordion State: ALL sections open by default!
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(ALL_SECTIONS));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (isOpen && lead) fetchLeadDetails(lead.id);
  }, [isOpen, lead]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchLeadDetails = async (id: number) => {
    setLoading(true);
    try {
      const [lr, ar] = await Promise.all([
        axios.get(`/api/crm/leads/${id}/`),
        axios.get(`/api/crm/leads/${id}/activities/`),
      ]);
      setLeadDetail(lr.data);
      setActivities(ar.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!leadDetail) return;
    setStatusUpdating(true);
    try {
      await axios.patch(`/api/crm/leads/${leadDetail.id}/status/`, { status: newStatus });
      setLeadDetail(prev => prev ? { ...prev, status: newStatus } : null);
      const ar = await axios.get(`/api/crm/leads/${leadDetail.id}/activities/`);
      setActivities(ar.data);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !leadDetail) return;
    setSavingNote(true);
    try {
      await axios.post(`/api/crm/leads/${leadDetail.id}/lead-notes/`, { note: newNote });
      setNewNote('');
      fetchLeadDetails(leadDetail.id);
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  if (!isOpen || !lead) return null;
  const d = leadDetail || lead;

  // Extract decision maker & rich profile signals
  const dm = (d.decision_maker || d.company_people?.[0] || {}) as any;
  const rawContact = (d.raw_data?.decision_makers?.[0] || d.raw_data?.contacts?.[0] || {}) as any;
  const fullName = dm.full_name || (dm.first_name || dm.last_name ? `${dm.first_name || ''} ${dm.last_name || ''}`.trim() : '') || rawContact.full_name || rawContact.name || d.raw_data?.contact_name || '';
  const jobTitle = dm.job_title || rawContact.title || rawContact.job_title || d.raw_data?.contact_job_title || '';
  const seniority = formatCleanLevel(dm.seniority_level || rawContact.seniority_level || d.raw_data?.contact_seniority || '');
  const functional = formatCleanLevel(dm.functional_level || '');
  const email = dm.email || rawContact.email || rawContact.work_email || d.raw_data?.contact_email || '';
  const personalEmail = dm.personal_email || rawContact.personal_email || d.raw_data?.contact_personal_email || '';
  const phone = dm.mobile_number || rawContact.phone || rawContact.mobile_phone || rawContact.personal_phone || d.raw_data?.contact_phone || d.raw_data?.contact_personal_phone || '';
  const linkedin = dm.linkedin || rawContact.linkedin || d.raw_data?.contact_linkedin || '';
  const dmCity = dm.city || rawContact.city || d.raw_data?.city || '';
  const dmState = dm.state || rawContact.state || d.raw_data?.state || '';
  const dmCountry = dm.country || rawContact.country || d.raw_data?.country || '';
  const dmLocation = [dmCity, dmState, dmCountry].filter(Boolean).join(', ');

  // Rich LinkedIn profile metadata from Nexus
  const liProfile = d.linkedin_profile || d.crm_signals?.linkedin_profile || d.raw_data?.nexus_linkedin_profile || d.raw_data?.linkedin_profile || {};
  const headline = liProfile.headline || dm.headline || rawContact.headline || '';
  const bio = liProfile.summary || liProfile.about || dm.about || '';
  const liRegisteredAt = liProfile.registered_at || liProfile.joined_at || '';
  const liFollowers = liProfile.follower_count ?? liProfile.followers_count ?? dm.follower_count ?? null;
  const liConnections = liProfile.connections_count ?? liProfile.connection_count ?? dm.connections_count ?? null;
  const isPremium = Boolean(liProfile.is_premium || dm.is_premium);
  const isInfluencer = Boolean(liProfile.is_influencer || dm.is_influencer);
  const isCreator = Boolean(liProfile.is_creator || dm.is_creator);
  const isOpenToWork = Boolean(liProfile.is_open_to_work || dm.is_open_to_work);
  const isHiring = Boolean(liProfile.is_hiring || dm.is_hiring);
  const isVerified = Boolean(liProfile.verified || dm.verified);
  const isPaidAdvertiser = Boolean(liProfile.isAdvertisement || liProfile.is_advertiser || liProfile.is_paid_advertiser || d.raw_data?.isAdvertisement);
  const liAvatar = liProfile.profile_image_url || dm.profile_image_url || '';
  const liCover = liProfile.cover_image_url || '';
  const liLanguages: any[] = Array.isArray(liProfile.languages) ? liProfile.languages : [];
  const liCertifications: any[] = Array.isArray(liProfile.certifications) ? liProfile.certifications : [];
  const liHonors: any[] = Array.isArray(liProfile.honors_and_awards) ? liProfile.honors_and_awards : [];
  const liVolunteering: any[] = Array.isArray(liProfile.volunteering) ? liProfile.volunteering : [];
  const liProjects: any[] = Array.isArray(liProfile.projects) ? liProfile.projects : [];
  const liServices: any[] = Array.isArray(liProfile.services) ? liProfile.services : [];
  const liCourses: any[] = Array.isArray(liProfile.courses) ? liProfile.courses : [];
  const liOrganizations: any[] = Array.isArray(liProfile.organizations) ? liProfile.organizations : [];

  const rawPosts: any[] = (Array.isArray(d.linkedin_posts) && d.linkedin_posts.length > 0)
    ? d.linkedin_posts
    : (Array.isArray(d.crm_signals?.linkedin_posts) ? d.crm_signals.linkedin_posts : (Array.isArray(d.raw_data?.nexus_linkedin_posts) ? d.raw_data.nexus_linkedin_posts : []));

  const seenPostIds = new Set<string>();
  const seenPostTexts = new Set<string>();
  const posts: any[] = [];
  for (const p of rawPosts) {
    if (!p) continue;
    const idKey = String(p.id || p.post_id || p.share_urn || p.linkedin_url || p.postUrl || p.post_url || p.url || '').trim();
    if (idKey && seenPostIds.has(idKey)) continue;
    if (idKey) seenPostIds.add(idKey);

    const rawText = String(p.content || p.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (rawText.length > 20) {
      if (seenPostTexts.has(rawText)) continue;
      seenPostTexts.add(rawText);
    }
    posts.push(p);
  }

  // Extract email drafts
  const drafts: { subject: string; body: string }[] = (d.email_drafts && d.email_drafts.length > 0) ? [...d.email_drafts] : [];
  if (drafts.length === 0 && d.crm_signals?.ai_consolidated_data?.email_draft) {
    const ed = d.crm_signals.ai_consolidated_data.email_draft;
    if (ed.subject || ed.body) {
      drafts.push({ subject: ed.subject || '', body: ed.body || '' });
    }
  }
  const targetOutreachEmail = email || personalEmail || d.company_email || '';

  // Extract firmographics
  const comp = d.raw_data?.company || d.raw_data?.nexus_lead || d.crm_signals?.company || {};
  const size = d.company_size || comp.employees?.toString() || comp.size || comp.company_size;
  const rev = d.company_annual_revenue_clean || d.company_annual_revenue || comp.annual_revenue_clean || comp.annual_revenue || comp.company_revenue || comp.revenue;
  const funding = d.company_total_funding_clean || d.company_total_funding || comp.total_funding_clean || comp.funding || comp.company_funding || comp.total_funding;
  const founded = d.raw_data?.company?.founded_year || comp.founded_year || comp.year_founded;
  const tech = (d.company_technologies && d.company_technologies.length > 0) ? d.company_technologies : (comp.tech_stack || comp.technologies || comp.company_keywords);
  const desc = d.company_description || comp.description || d.crm_signals?.company_summary || d.crm_signals?.ai_consolidated_data?.company_summary;
  const kw = d.keywords || comp.keywords;
  const fullAddress = d.company_full_address || [d.company_street_address, d.city, d.state, d.company_postal_code, d.country].filter(Boolean).join(', ') || [d.city, d.state, d.country].filter(Boolean).join(', ');

  // AI Reasoning
  const aiReasoning = d.ai_reasoning || 
    d.crm_signals?.ai_consolidated_data?.qualification_reasoning || 
    d.crm_signals?.qualification_reasoning || 
    d.crm_signals?.qualification_reason || 
    d.crm_signals?.reasoning || 
    d.raw_data?.ai_evaluation?.reasoning || 
    d.raw_data?.qualification_reasoning;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between flex-none gap-4 bg-zinc-900">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight truncate">{d.company_name}</h3>
              <select
                value={d.status}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-zinc-800/80 border border-zinc-700/80 text-xs text-zinc-200 rounded-md px-2 py-0.5 focus:outline-none focus:border-zinc-500 cursor-pointer font-medium"
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up_scheduled">Follow-Up Scheduled</option>
                <option value="in_discussion">In Discussion</option>
                <option value="meeting_booked">Meeting Booked</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
                <option value="unqualified">Unqualified</option>
              </select>

              {d.score != null && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/70 text-zinc-300 border border-zinc-700/60 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${d.score >= 70 ? 'bg-emerald-400' : d.score >= 40 ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                  {d.score}{d.score_label ? ` · ${d.score_label.toUpperCase()}` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {d.lid && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 font-semibold">
                  {d.lid}
                </span>
              )}
              {d.campaign_id && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
                  {d.campaign_id}
                </span>
              )}
              {d.source_campaign_id != null && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
                  CID: {d.source_campaign_id}
                </span>
              )}
              {d.stage && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border capitalize ${
                  d.status === 'unqualified'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-medium'
                    : d.stage === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                }`}>
                  {d.status === 'unqualified' ? `Failed at: ${d.stage.replace(/_/g, ' ')}` : d.stage.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {/* Quick Follow-Up Status Strip with Professional SVGs */}
            <div className="mt-2.5 p-2 bg-zinc-950/60 border border-zinc-800/60 rounded-lg flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-zinc-300 min-w-0">
                <svg className="w-3.5 h-3.5 text-zinc-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
                {d.follow_up_date ? (
                  <div className="truncate">
                    <span className="font-semibold text-white">Next Follow-Up: </span>
                    <span className="text-zinc-200 font-medium">{d.follow_up_date} {d.follow_up_time || ''}</span>
                    <span className="text-zinc-400 ml-1">({d.follow_up_action_type || 'call'})</span>
                    {d.follow_up_notes && <span className="text-zinc-400 ml-1.5 italic truncate">— "{d.follow_up_notes}"</span>}
                  </div>
                ) : (
                  <span className="text-zinc-500 italic">No follow-up currently scheduled</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-none">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <svg className="w-3 h-3 text-zinc-950 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                  <span>{d.follow_up_date ? 'Reschedule' : 'Set Follow-Up'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border border-zinc-700/80"
                >
                  <svg className="w-3 h-3 text-zinc-300 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <span>Log Touch</span>
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex-none self-start mt-0.5"
            title="Close modal (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Sequential Sections Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Unqualified / Failure Warning Banner */}
              {d.status === 'unqualified' && (
                <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative flex-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                      <span className="text-xs font-bold text-rose-300 tracking-wider uppercase">
                        Lead Qualification Dropped / Failed
                      </span>
                    </div>
                    {d.stage && (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-rose-900/50 text-rose-200 border border-rose-700/50 font-semibold capitalize">
                        Failed at Stage: {d.stage.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {aiReasoning ? (
                    <div className="text-xs text-rose-200/90 leading-relaxed bg-black/40 p-3 rounded-lg border border-rose-900/50">
                      <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-rose-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        Evaluation & Failure Notes:
                      </div>
                      <p className="whitespace-pre-wrap">{aiReasoning}</p>
                    </div>
                  ) : (
                    <div className="text-xs text-rose-300/80 bg-black/30 p-2.5 rounded-lg border border-rose-900/30">
                      This lead did not meet the qualification criteria during the <span className="font-semibold text-rose-200">{d.stage?.replace(/_/g, ' ') || 'qualification'}</span> stage.
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 1: COMPANY & FIRMOGRAPHICS (First as requested!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="company"
                title="1. Company & Firmographics"
                subtitle="Company size, revenue, funding, tech stack, location & web presence"
                badge={d.industry ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                    {d.industry}
                  </span>
                ) : null}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                }
                isOpen={expandedSections.has('company')}
                onToggle={() => toggleSection('company')}
              >
                <div className="space-y-3 pt-1">
                  {/* Firmometrics 4-Column Metric Strip (Clean, borderless grid) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">Company Size</span>
                      <p className="text-sm font-semibold text-zinc-200 mt-0.5">{size || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">Est. Revenue</span>
                      <p className="text-sm font-semibold text-zinc-200 mt-0.5">{formatCleanMoney(rev) || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">Total Funding</span>
                      <p className="text-sm font-semibold text-zinc-200 mt-0.5">{formatCleanMoney(funding) || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">Founded Year</span>
                      <p className="text-sm font-semibold text-zinc-200 mt-0.5">{founded ? String(founded) : '-'}</p>
                    </div>
                  </div>

                  {/* Company Basic Information */}
                  <div className="py-1 space-y-0.5">
                    <Row label="Company Name" value={d.company_name} />
                    <Row 
                      label="Website" 
                      value={d.company_website ? (
                        <a href={d.company_website} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline">
                          {d.company_website} ↗
                        </a>
                      ) : null} 
                    />
                    <Row label="Domain" value={d.company_domain} />
                    <ContactRow label="Company Phone" value={d.company_phone} type="phone" />
                    <ContactRow label="Company Email" value={d.company_email} type="email" />
                    <Row label="Industry" value={d.industry} />
                    <Row label="Company Location" value={[d.city, d.state, d.country].filter(Boolean).join(', ')} />
                    <Row label="Full Address" value={fullAddress} />
                    <CoordRow lat={d.latitude} lng={d.longitude} />
                    <TagListRow label="Keywords" items={kw} />
                    <TagListRow label="Tech Stack" items={tech} />
                  </div>

                  {/* Company Description */}
                  {desc && (
                    <div className="pt-2 border-t border-zinc-800/30 space-y-1">
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block">Website Summary / Description</span>
                      <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-line text-left bg-zinc-950/30 p-3 rounded-lg border border-zinc-800/30">
                        {desc}
                      </p>
                    </div>
                  )}

                  {/* Company Social Media Links with Professional SVGs */}
                  <div className="pt-2 border-t border-zinc-800/30">
                    <p className="text-[11px] text-zinc-500 mb-2 font-medium">Company Social Media & Web Links</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.company_website && (
                        <a href={d.company_website} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                          </svg>
                          <span>Website ↗</span>
                        </a>
                      )}
                      {d.company_linkedin && (
                        <a href={d.company_linkedin} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          <span>LinkedIn ↗</span>
                        </a>
                      )}
                      {d.google_maps_url && (
                        <a href={d.google_maps_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span>Google Maps ↗</span>
                        </a>
                      )}
                      {d.facebook_url && (
                        <a href={d.facebook_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span>Facebook ↗</span>
                        </a>
                      )}
                      {d.twitter_url && (
                        <a href={d.twitter_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span>X / Twitter ↗</span>
                        </a>
                      )}
                      {d.instagram_url && (
                        <a href={d.instagram_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                          <span>Instagram ↗</span>
                        </a>
                      )}
                      {d.youtube_url && (
                        <a href={d.youtube_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          <span>YouTube ↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionSection>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 2: DECISION MAKER & DIRECT CONTACTS (Second!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="decision_maker"
                title="2. Decision Maker & Direct Contacts"
                subtitle="Verified decision maker profile, direct phone, emails & LinkedIn activity"
                badge={seniority ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                    {seniority}
                  </span>
                ) : null}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                }
                isOpen={expandedSections.has('decision_maker')}
                onToggle={() => toggleSection('decision_maker')}
              >
                {fullName || jobTitle || email || phone || linkedin ? (
                  <div className="space-y-3 pt-1">
                    {/* Decision Maker Profile Banner */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800/40">
                      <div className="flex items-start gap-3 min-w-0">
                        {liAvatar ? (
                          <img src={liAvatar} alt={fullName} className="w-11 h-11 rounded-full object-cover border border-zinc-700/80 shadow flex-none" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-700/30 border border-primary-500/40 text-primary-300 flex items-center justify-center font-bold text-sm shadow flex-none">
                            {(fullName && fullName.charAt(0)) || 'DM'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                            {fullName || 'Decision Maker Name Missing'}
                            {seniority && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                                {seniority}
                              </span>
                            )}
                            {isVerified && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5">
                                ✓ Verified
                              </span>
                            )}
                          </h4>
                          {jobTitle && <p className="text-xs text-zinc-300 font-medium mt-0.5">{jobTitle}</p>}
                          {headline && <p className="text-[11px] text-zinc-400 mt-0.5 italic">{headline}</p>}

                          {/* Quick Badges Strip */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {isPremium && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                ★ Premium
                              </span>
                            )}
                            {isInfluencer && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                🎙️ Influencer
                              </span>
                            )}
                            {isCreator && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                ✨ Creator
                              </span>
                            )}
                            {isOpenToWork && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                🟢 Open to Work
                              </span>
                            )}
                            {isHiring && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                💼 Hiring
                              </span>
                            )}
                            {isPaidAdvertiser && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                📢 Paid Advertiser
                              </span>
                            )}
                            {liFollowers !== null && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                                👥 {Number(liFollowers).toLocaleString()} Followers
                              </span>
                            )}
                            {liConnections !== null && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                                🔗 {Number(liConnections).toLocaleString()}+ Connections
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {linkedin && (
                        <a 
                          href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs border border-zinc-700/60 flex-none" 
                          title="Open LinkedIn Profile"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                          <span>Profile ↗</span>
                        </a>
                      )}
                    </div>

                    {/* Contact Rows */}
                    <div className="space-y-0.5">
                      {functional && <Row label="Functional Area" value={functional} />}
                      <ContactRow label="Work Email" value={email} type="email" />
                      <ContactRow label="Personal Email" value={personalEmail} type="email" />
                      <ContactRow label="Direct Phone" value={phone} type="phone" />
                      {dmLocation && <Row label="Person Location" value={dmLocation} />}
                    </div>

                    {/* LinkedIn Bio Snippet */}
                    {bio && (
                      <div className="pt-2 border-t border-zinc-800/30 text-xs text-zinc-400">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">LinkedIn Bio / About</span>
                        <p className="line-clamp-3 leading-relaxed text-zinc-300 italic">{bio}</p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-zinc-500">
                    No verified decision maker contact information identified for this company yet.
                  </div>
                )}
              </AccordionSection>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 3: LINKEDIN PROFILE DATA (Third!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="linkedin_profile"
                title="3. LinkedIn Profile Data"
                subtitle="Rich LinkedIn scraping data: bio, badges, network stats, certs & career"
                icon={
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                }
                isOpen={expandedSections.has('linkedin_profile')}
                onToggle={() => toggleSection('linkedin_profile')}
              >
                {Object.keys(liProfile).length > 0 || fullName ? (
                  <div className="space-y-4 pt-1">
                    {/* Profile Banner & Executive Header Card */}
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800/70 bg-zinc-950/70 shadow-sm">
                      {liCover && (
                        <div className="h-24 w-full overflow-hidden relative">
                          <img src={liCover} alt="Cover" className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950" />
                        </div>
                      )}
                      <div className="p-4 relative">
                        <div className="flex items-start gap-3.5">
                          {liAvatar ? (
                            <img src={liAvatar} alt={fullName} className={`w-14 h-14 rounded-full object-cover border-2 border-zinc-700 shadow-md flex-none ${liCover ? '-mt-10' : ''}`} />
                          ) : (
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center border-2 border-zinc-700 shadow-md flex-none ${liCover ? '-mt-10' : ''}`}>
                              {(fullName && fullName.charAt(0)) || 'LI'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-bold text-white">{fullName || 'LinkedIn Member'}</h4>
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                  ✓ Verified Identity
                                </span>
                              )}
                              {linkedin && (
                                <a 
                                  href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-primary-400 hover:text-primary-300 text-xs hover:underline flex items-center gap-0.5 ml-auto"
                                >
                                  Open LinkedIn ↗
                                </a>
                              )}
                            </div>
                            {headline && (
                              <p className="text-xs text-zinc-300 mt-1 font-medium leading-snug">{headline}</p>
                            )}
                            {dmLocation && (
                              <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                                📍 {dmLocation}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Account Badges Row */}
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/60 flex-wrap">
                          {isPremium && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                              ★ Premium Member
                            </span>
                          )}
                          {isInfluencer && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm">
                              🎙️ Top Voice / Influencer
                            </span>
                          )}
                          {isCreator && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm">
                              ✨ Creator Mode
                            </span>
                          )}
                          {isOpenToWork && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                              🟢 #OpenToWork
                            </span>
                          )}
                          {isHiring && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm">
                              💼 #Hiring
                            </span>
                          )}
                          {isPaidAdvertiser && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm">
                              📢 Paid Advertiser
                            </span>
                          )}
                          {!isPremium && !isInfluencer && !isCreator && !isOpenToWork && !isHiring && !isPaidAdvertiser && (
                            <span className="text-[10px] text-zinc-500 italic">Standard Member Profile</span>
                          )}
                        </div>

                        {/* Quick 4-Box Metric Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-zinc-800/60 text-xs">
                          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-center">
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Followers</span>
                            <span className="text-sm font-bold text-white mt-0.5 block">
                              {liFollowers !== null ? Number(liFollowers).toLocaleString() : '—'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-center">
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Connections</span>
                            <span className="text-sm font-bold text-white mt-0.5 block">
                              {liConnections !== null ? `${Number(liConnections).toLocaleString()}+` : '—'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-center">
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Joined LinkedIn</span>
                            <span className="text-[11px] font-bold text-zinc-200 mt-1 block truncate" title={liRegisteredAt ? formatEasternDateTime(liRegisteredAt) : ''}>
                              {liRegisteredAt ? formatEasternDateTime(liRegisteredAt) : '—'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-center">
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">Seniority</span>
                            <span className="text-xs font-bold text-primary-300 mt-0.5 block truncate">
                              {seniority || 'Professional'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About / Executive Bio */}
                    {bio && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            About / Executive Summary
                          </span>
                        </div>
                        <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap shadow-inner">
                          {bio}
                        </div>
                      </div>
                    )}

                    {/* Account Status & Verification Summary */}
                    <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/50">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                        Account Signals & Verification
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                          <span className="text-zinc-400 text-[11px]">Premium Account:</span>
                          <span className={`font-semibold text-[11px] ${isPremium ? 'text-amber-400' : 'text-zinc-500'}`}>{isPremium ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                          <span className="text-zinc-400 text-[11px]">Top Voice / Influencer:</span>
                          <span className={`font-semibold text-[11px] ${isInfluencer ? 'text-purple-400' : 'text-zinc-500'}`}>{isInfluencer ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                          <span className="text-zinc-400 text-[11px]">Verified Identity:</span>
                          <span className={`font-semibold text-[11px] ${isVerified ? 'text-cyan-400' : 'text-zinc-500'}`}>{isVerified ? 'Verified ✓' : 'Unverified'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                          <span className="text-zinc-400 text-[11px]">Paid Advertiser:</span>
                          <span className={`font-semibold text-[11px] ${isPaidAdvertiser ? 'text-rose-400' : 'text-zinc-500'}`}>{isPaidAdvertiser ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                          <span className="text-zinc-400 text-[11px]">Creator Mode:</span>
                          <span className={`font-semibold text-[11px] ${isCreator ? 'text-indigo-400' : 'text-zinc-500'}`}>{isCreator ? 'Active' : 'Off'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                          <span className="text-zinc-400 text-[11px]">Open To Work:</span>
                          <span className={`font-semibold text-[11px] ${isOpenToWork ? 'text-emerald-400' : 'text-zinc-500'}`}>{isOpenToWork ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    <TagListRow label="Skills" items={liProfile.skills} />

                    {/* Languages Spoken */}
                    {liLanguages.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/40">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          🌐 Languages ({liLanguages.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {liLanguages.map((lang: any, i: number) => {
                            const name = typeof lang === 'string' ? lang : lang.name || lang.language || JSON.stringify(lang);
                            return (
                              <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-zinc-900/80 text-zinc-200 border border-zinc-800 flex items-center gap-1">
                                🗣️ {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Licenses & Certifications */}
                    {liCertifications.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/40">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                          📜 Licenses & Certifications ({liCertifications.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {liCertifications.map((cert: any, i: number) => {
                            const logoUrl = cert.issuedByLogo?.url || (typeof cert.issuedByLogo === 'string' ? cert.issuedByLogo : null);
                            return (
                              <div key={i} className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 flex items-start gap-3">
                                {logoUrl ? (
                                  <img src={logoUrl} alt={cert.issuedBy || 'Issuer'} className="w-9 h-9 rounded-lg object-contain bg-white/5 border border-zinc-700/50 flex-none" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-xs font-bold text-zinc-400 flex-none">
                                    🏅
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-semibold text-xs text-white truncate">{cert.title || 'Certification'}</h5>
                                  <p className="text-[11px] text-zinc-300 mt-0.5">{cert.issuedBy || ''}</p>
                                  {cert.issuedAt && <p className="text-[10px] text-zinc-500 mt-0.5">{cert.issuedAt}</p>}
                                  {cert.credentialId && <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">ID: {cert.credentialId}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Experience History */}
                    {Array.isArray(liProfile.experience_history) && liProfile.experience_history.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/40">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                          💼 Experience History ({liProfile.experience_history.length})
                        </span>
                        <div className="space-y-2">
                          {liProfile.experience_history.map((exp: any, i: number) => {
                            const title = exp.position || exp.title || 'Unknown Title';
                            const company = exp.companyName || exp.company_name || exp.company || 'Unknown Company';
                            const startDate = exp.startDate?.text || exp.start_date || '';
                            const endDate = exp.endDate?.text || exp.end_date || 'Present';
                            return (
                              <div key={i} className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/40 text-xs">
                                <h5 className="font-semibold text-zinc-200">{title}</h5>
                                <p className="text-zinc-400 mt-0.5 font-medium">{company}</p>
                                {(startDate || endDate !== 'Present' || exp.endDate) && (
                                  <p className="text-[10px] text-zinc-500 mt-1">
                                    {startDate} - {endDate}
                                  </p>
                                )}
                                {exp.description && (
                                  <p className="text-zinc-400 mt-1.5 leading-relaxed whitespace-pre-wrap bg-zinc-900/30 p-2 rounded border border-zinc-800/30">{exp.description}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Education History */}
                    {Array.isArray(liProfile.education_history) && liProfile.education_history.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/40">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                          🎓 Education History ({liProfile.education_history.length})
                        </span>
                        <div className="space-y-2">
                          {liProfile.education_history.map((edu: any, i: number) => {
                            const school = edu.schoolName || edu.school_name || edu.school || 'Unknown School';
                            const degree = edu.degree || edu.degreeName || '';
                            const field = edu.fieldOfStudy || edu.field_of_study || '';
                            const startDate = edu.startDate?.text || edu.start_date || '';
                            const endDate = edu.endDate?.text || edu.end_date || 'Present';
                            return (
                              <div key={i} className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/40 text-xs">
                                <h5 className="font-semibold text-zinc-200">{school}</h5>
                                {(degree || field) && (
                                  <p className="text-zinc-400 mt-0.5">
                                    {degree} {degree && field ? 'in' : ''} {field}
                                  </p>
                                )}
                                {(startDate || endDate !== 'Present' || edu.endDate) && (
                                  <p className="text-[10px] text-zinc-500 mt-1">
                                    {startDate} - {endDate}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-zinc-500">
                    No LinkedIn profile data available for this lead.
                  </div>
                )}
              </AccordionSection>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 4: LINKEDIN POSTS DATA (Fourth!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="linkedin_posts"
                title="4. LinkedIn Posts Data"
                subtitle="Recent LinkedIn posts, engagement metrics & activity breakdown"
                badge={posts.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-300 border border-primary-500/20">
                    {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
                  </span>
                ) : null}
                icon={
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22 3H2C.9 3 0 3.9 0 5v14c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8 17H5V9h3v8zm11 0h-3v-4.5c0-1.1-.9-2-2-2s-2 .9-2 2V17h-3V9h3v1.2c1-.9 2.5-1.2 3.8-.5 1.2.6 1.9 1.8 1.9 3.2V17z"/>
                  </svg>
                }
                isOpen={expandedSections.has('linkedin_posts')}
                onToggle={() => toggleSection('linkedin_posts')}
              >
                {posts && posts.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-3">
                      {posts.map((p: any, idx: number) => {
                        const content = p.content || p.text || p.postUrl || '';
                        const rawDate = p.posted_at || p.postedAt || p.date || p.time;
                        const date = formatEasternDateTime(rawDate) || rawDate || '';
                        const url = p.postUrl || p.post_url || p.url || p.linkedin_url || p.share_linkedin_url;
                        const likes = typeof p.likes === 'number' ? p.likes : (p.likes ? Number(p.likes) : 0);
                        const comments = typeof p.comments === 'number' ? p.comments : (p.comments ? Number(p.comments) : 0);
                        const shares = typeof p.shares === 'number' ? p.shares : (p.shares ? Number(p.shares) : 0);
                        const postType = p.post_type || p.type || 'Post';
                        const postedAgo = p.posted_ago_text || '';
                        const authorName = p.author_name || fullName || 'Author';
                        const authorHeadline = p.author_headline || headline || '';
                        const authorAvatar = p.author_avatar_url || liAvatar || '';
                        const reactionsBreakdown = Array.isArray(p.reactions_breakdown) ? p.reactions_breakdown : [];
                        
                        // Images & Media
                        const postImages = Array.isArray(p.images) && p.images.length > 0 
                          ? p.images 
                          : (Array.isArray(p.post_images) && p.post_images.length > 0 
                              ? p.post_images 
                              : (Array.isArray(p.media_urls) ? p.media_urls : []));
                        
                        // Article Preview
                        const articleTitle = p.article_title || p.article?.title;
                        const articleUrl = p.article_url || p.article?.url;
                        const articleImage = p.article_image || p.article?.image;
                        const articlePublisher = p.article_publisher || p.article?.publisher;

                        return (
                          <div key={idx} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/60 text-xs text-zinc-300 space-y-3 hover:border-zinc-700/60 transition-colors shadow-sm">
                            {/* Post Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {authorAvatar ? (
                                  <img src={authorAvatar} alt={authorName} className="w-8 h-8 rounded-full object-cover border border-zinc-700 flex-none" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/40 text-primary-300 flex items-center justify-center font-bold text-xs flex-none">
                                    {(authorName && authorName.charAt(0)) || 'L'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-white truncate text-xs flex items-center gap-1.5">
                                    {authorName}
                                    <span className="text-[10px] font-normal uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                      {postType}
                                    </span>
                                  </h5>
                                  {authorHeadline && (
                                    <p className="text-[11px] text-zinc-400 truncate">{authorHeadline}</p>
                                  )}
                                </div>
                              </div>
                              {postedAgo && (
                                <span className="text-[10px] text-zinc-500 flex-none whitespace-nowrap bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                  {postedAgo}
                                </span>
                              )}
                            </div>

                            {/* Post Body Content */}
                            {content && (
                              <p className="leading-relaxed whitespace-pre-wrap text-zinc-200 text-xs bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/30 font-normal">
                                {content}
                              </p>
                            )}

                            {/* Post Images Gallery (if any) */}
                            {postImages.length > 0 && (
                              <div className={`grid gap-2 ${postImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {postImages.map((img: any, imgIdx: number) => {
                                  const src = typeof img === 'string' ? img : img.url || img.src;
                                  if (!src) return null;
                                  return (
                                    <a key={imgIdx} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-zinc-800 hover:border-zinc-700 group">
                                      <img src={src} alt="Post media" className="w-full max-h-56 object-cover group-hover:scale-102 transition-transform duration-200" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            {/* Article Attachment (if any) */}
                            {articleTitle && (
                              <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center gap-3">
                                {articleImage && (
                                  <img src={articleImage} alt={articleTitle} className="w-14 h-14 rounded object-cover flex-none border border-zinc-800" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <h6 className="font-semibold text-white text-xs truncate">{articleTitle}</h6>
                                  {articlePublisher && <p className="text-[10px] text-zinc-400 mt-0.5">{articlePublisher}</p>}
                                  {articleUrl && (
                                    <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary-400 hover:underline mt-0.5 block truncate">
                                      Read Article ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Engagement Stats & Reactions Breakdown */}
                            <div className="pt-2.5 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
                              {/* Metric counters */}
                              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium flex items-center gap-1" title="Likes">
                                  👍 <span className="font-semibold text-white">{likes}</span> Likes
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium flex items-center gap-1" title="Comments">
                                  💬 <span className="font-semibold text-white">{comments}</span> Comments
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium flex items-center gap-1" title="Shares / Reposts">
                                  🔁 <span className="font-semibold text-white">{shares}</span> Reposts
                                </span>

                                {/* Reactions breakdown badges */}
                                {reactionsBreakdown.map((rb: any, rbIdx: number) => {
                                  const type = String(rb.type || rb.reaction_type || '').toUpperCase();
                                  const count = rb.count || 0;
                                  if (!count) return null;
                                  let icon = '👍';
                                  if (type.includes('PRAISE') || type.includes('CELEBRATE')) icon = '👏';
                                  else if (type.includes('EMPATHY') || type.includes('LOVE')) icon = '❤️';
                                  else if (type.includes('INTEREST') || type.includes('INSIGHT')) icon = '💡';
                                  else if (type.includes('ENTERTAIN') || type.includes('FUNNY')) icon = '😆';
                                  return (
                                    <span key={rbIdx} className="px-1.5 py-0.5 rounded bg-zinc-900/80 text-zinc-400 border border-zinc-800 text-[10px] flex items-center gap-0.5">
                                      {icon} {count}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Timestamp & Direct Link */}
                              <div className="flex items-center gap-3 text-[10px] text-zinc-500 ml-auto">
                                {date && <span>{date}</span>}
                                {url && (
                                  <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 hover:underline flex items-center gap-1 font-medium">
                                    View on LinkedIn ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-zinc-500">
                    No LinkedIn posts available for this lead.
                  </div>
                )}
              </AccordionSection>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 5: AI ICP INTELLIGENCE & QUALIFICATION (Fifth!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="ai_insights"
                title="5. AI ICP Intelligence & Qualification"
                subtitle="Evaluation criteria pass/fail breakdown, pain points & strategic gaps"
                badge={d.status ? (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${d.status === 'qualified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'}`}>
                    {d.status}
                  </span>
                ) : null}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                }
                isOpen={expandedSections.has('ai_insights')}
                onToggle={() => toggleSection('ai_insights')}
              >
                <div className="space-y-3 pt-1">
                  {/* AI Qualification Reasoning */}
                  {aiReasoning ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-zinc-800/40">
                        <span className="text-xs font-semibold text-zinc-200">Qualification Reasoning & Criteria</span>
                        <span className="text-[10px] text-zinc-500">Evaluated against Agency ICP</span>
                      </div>
                      {renderAIReasoningBullets(aiReasoning)}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-zinc-500">
                      No AI Qualification Reasoning recorded for this lead yet.
                    </div>
                  )}

                  {/* Strategic Insights (Pain Points, Operational Gap, Opportunity) */}
                  {d.insight && (
                    <div className="pt-2 border-t border-zinc-800/40 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-zinc-800/40">
                        <span className="text-xs font-semibold text-zinc-200">Strategic Business Insights</span>
                        <span className="text-[10px] text-zinc-500">3-Perspective Analysis</span>
                      </div>

                      <div className="grid gap-2.5 pt-0.5">
                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                          <h5 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Pain Points
                          </h5>
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.insight.pain_points}</p>
                        </div>

                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                          <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Operational Gap
                          </h5>
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.insight.operational_gap}</p>
                        </div>

                        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                          <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Opportunity & Pitch Angle
                          </h5>
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.insight.opportunity}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Classified Tags */}
                  {d.tags && d.tags.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/30">
                      <p className="text-[11px] font-medium text-zinc-400 mb-1.5">Classified Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/70 text-zinc-300 border border-zinc-700/60">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 6: AI COLD OUTREACH PITCH (Sixth!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="pitch"
                title="6. AI Cold Outreach Pitch"
                subtitle="Personalized cold outreach email draft ready to copy or open in mail client"
                badge={drafts.length > 0 ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                    {drafts.length} Template{drafts.length > 1 ? 's' : ''}
                  </span>
                ) : null}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                }
                isOpen={expandedSections.has('pitch')}
                onToggle={() => toggleSection('pitch')}
              >
                {drafts.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {drafts.map((draft, idx) => (
                      <div key={idx} className="bg-zinc-950/40 p-3.5 rounded-lg border border-zinc-800/50 space-y-3">
                        {/* Subject Line with Copy button */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-800/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Subject</span>
                            <p className="text-xs font-semibold text-white mt-0.5">{draft.subject}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(draft.subject, `subj_${idx}`)}
                            className="text-[11px] px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex-none cursor-pointer border border-zinc-700/60"
                          >
                            {copiedKey === `subj_${idx}` ? '✓ Copied' : 'Copy Subject'}
                          </button>
                        </div>

                        {/* Body with Copy Body and Quick Mailto */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email Body</span>
                            <div className="flex items-center gap-2">
                              {targetOutreachEmail && (
                                <a
                                  href={`mailto:${targetOutreachEmail}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
                                  className="text-[11px] px-2.5 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors flex items-center gap-1 shadow-xs"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  Open in Mail
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(draft.body, `body_${idx}`)}
                                className="text-[11px] px-2.5 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold transition-colors cursor-pointer shadow-xs"
                              >
                                {copiedKey === `body_${idx}` ? '✓ Copied Body' : 'Copy Body'}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/40">
                            {draft.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-zinc-500">
                    No AI cold email draft has been generated for this lead yet.
                  </div>
                )}
              </AccordionSection>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 7: NOTES & ACTIVITY TIMELINE (Seventh!)
              ───────────────────────────────────────────────────────────── */}
              <AccordionSection
                id="notes"
                title="7. Notes & Activity Timeline"
                subtitle="Conversation logs, meeting notes & chronological system activity history"
                badge={(
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                    {d.notes_history?.length || (d.notes ? 1 : 0)} Notes &bull; {activities.length} Events
                  </span>
                )}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                }
                isOpen={expandedSections.has('notes')}
                onToggle={() => toggleSection('notes')}
              >
                <div className="space-y-3 pt-1">
                  {/* Quick Add Note Form */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-200 block">Log Conversation or Follow-up Note</span>
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Log quick note (e.g. Call outcome, key objections, next steps)..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !newNote.trim()}
                        className="px-3.5 py-2 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50 transition-colors flex items-center gap-1.5 flex-none cursor-pointer shadow-xs"
                      >
                        {savingNote ? 'Saving...' : 'Add Note'}
                      </button>
                    </form>
                  </div>

                  {/* Notes History Feed */}
                  <div className="pt-2 border-t border-zinc-800/30 space-y-2">
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Conversation Notes History ({d.notes_history?.length || (d.notes ? 1 : 0)})
                    </span>

                    <div className="divide-y divide-zinc-800/40 max-h-56 overflow-y-auto bg-zinc-950/40 rounded-lg border border-zinc-800/40">
                      {d.notes_history && d.notes_history.length > 0 ? (
                        d.notes_history.map((n) => (
                          <div key={n.id} className="p-3 text-xs flex flex-col gap-1">
                            <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                              <span className="font-semibold text-zinc-300">{n.created_by || 'admin'}</span>
                              <span>{formatEasternDateTime(n.created_at)}</span>
                            </div>
                            <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                          </div>
                        ))
                      ) : d.notes ? (
                        <div className="p-3 text-xs">
                          <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{d.notes}</p>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-zinc-500">
                          No conversation notes logged yet. Use the input box above to record meeting takeaways.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity History Audit Trail */}
                  <div className="pt-2 border-t border-zinc-800/30 space-y-2">
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Activity History Audit Trail ({activities.length} logged events)
                    </span>

                    {activities.length > 0 ? (
                      <div className="divide-y divide-zinc-800/40 max-h-56 overflow-y-auto bg-zinc-950/40 rounded-lg border border-zinc-800/40">
                        {[...activities].reverse().map((a) => (
                          <div key={a.id} className="flex items-start justify-between px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-200 capitalize">{a.activity_type.replace(/_/g, ' ')}</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">{a.description}</p>
                            </div>
                            <span className="text-[10px] text-zinc-500 flex-none ml-4 whitespace-nowrap font-mono">
                              {formatEasternDateTime(a.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-zinc-500">
                        No activities logged yet. Use "Log Touch" to record calls, emails, or meetings.
                      </div>
                    )}
                  </div>

                  {/* Metadata and Timestamps */}
                  <div className="flex gap-4 pt-2 border-t border-zinc-800/30 flex-wrap text-[11px] text-zinc-500 font-mono">
                    {d.scraped_at && <span>Scraped: {formatEasternDateTime(d.scraped_at)}</span>}
                    {d.created_at && <span>Created: {formatEasternDateTime(d.created_at)}</span>}
                    {d.updated_at && <span>Updated: {formatEasternDateTime(d.updated_at)}</span>}
                  </div>
                </div>
              </AccordionSection>
            </>
          )}
        </div>
      </div>

      {/* Embedded Follow-Up & Outreach Modals */}
      <ScheduleFollowUpModal
        lead={d}
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => fetchLeadDetails(d.id)}
      />

      <LogOutreachModal
        lead={d}
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => fetchLeadDetails(d.id)}
      />
    </div>
  );
}
