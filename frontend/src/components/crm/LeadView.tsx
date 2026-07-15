'use client';

import axios from 'axios';
import { useState, useEffect } from 'react';

interface Lead {
  id: number;
  lid?: string;
  place_id?: string;
  name: string;
  source?: string;
  address?: string;
  street_address?: string;
  neighborhood?: string;
  city?: string;
  postal_code?: string;
  company_phone?: string;
  website?: string;
  google_maps_url?: string;
  company_email?: string;
  rating?: number;
  review_count?: number;
  price_level?: string | null;
  category?: string;
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
  linkedin_url?: string;
  youtube_url?: string;
  social_links?: Record<string, string>;
  crm_signals?: Record<string, any>;
  raw_data?: Record<string, any>;
  firecrawl_raw_data?: any[];
  ai_reasoning?: string | null;
  insight?: {
    pain_points: string;
    operational_gap: string;
    opportunity: string;
  } | null;
  email_drafts?: {
    subject: string;
    body: string;
  }[];
  working_hours?: string;
  scraped_at?: string;
  created_at?: string;
  updated_at?: string;
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

const STATUS_LABELS: Record<string, string> = {
  new: 'New', qualified: 'Qualified', unqualified: 'Unqualified'
};



const CLASSIFICATION_LABELS: Record<string, string> = {
  agent: 'Agent', brokerage: 'Brokerage', investor: 'Investor',
  property_mgmt: 'Property Mgmt', developer: 'Developer',
};

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-28">{label}</span>
      <span className="text-sm text-zinc-200 text-right break-all">{value != null && value !== '' ? value : <span className="text-zinc-600">—</span>}</span>
    </div>
  );
}

function IconLink({ href, icon, label }: { href?: string | null; icon: React.ReactNode; label: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={label} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-primary-400 hover:bg-zinc-800 transition-all duration-150">
      {icon}
    </a>
  );
}

function MultiIconLink({ icon, label, urls }: { icon: React.ReactNode, label: string, urls: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-none">
      <button 
        onClick={() => setOpen(!open)}
        title={label}
        className="w-8 h-8 relative flex items-center justify-center rounded-lg text-zinc-400 hover:text-primary-400 hover:bg-zinc-800 transition-all duration-150"
      >
        {icon}
        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-zinc-900 leading-none px-1 shadow-sm">
          {urls.length}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-fade-in">
            <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 border-b border-zinc-700/50 uppercase tracking-wider">
              {label} URLs
            </div>
            {urls.map((url, i) => (
              <a 
                key={i} 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors truncate"
                title={url}
              >
                {url}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getSocialIcon(url: string): { icon: React.ReactNode; label: string } | null {
  if (typeof url !== 'string') return null;
  const u = url.toLowerCase();
  if (u.includes('facebook') || u.includes('fb.com')) {
    return {
      label: 'Facebook',
      icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
    };
  }
  if (u.includes('x.com') || u.includes('twitter')) {
    return {
      label: 'X (Twitter)',
      icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
    };
  }
  if (u.includes('instagram')) {
    return {
      label: 'Instagram',
      icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
    };
  }
  if (u.includes('linkedin')) {
    return {
      label: 'LinkedIn',
      icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
    };
  }
  if (u.includes('youtube') || u.includes('youtu.be')) {
    return {
      label: 'YouTube',
      icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
    };
  }
  return null;
}

function CoordRow({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  if (lat == null && lng == null) return null;
  const mapsUrl = lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-28">Coordinates</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-200">{lat?.toFixed(6)}, {lng?.toFixed(6)}</span>
        {mapsUrl && <IconLink href={mapsUrl} icon={
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        } label="Open in Maps" />}
      </div>
    </div>
  );
}


function CollapsibleBlock({ label, icon, borderColor, defaultOpen = false, children }: { label: string; icon?: React.ReactNode; borderColor: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button 
        onClick={() => setOpen(!open)} 
        className="section-label mb-2 flex items-center gap-2 hover:opacity-80 transition-opacity w-full text-left focus:outline-none"
      >
        <svg className={`w-3 h-3 transition-transform text-zinc-500 ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {icon}
        {label}
      </button>
      {open && (
        <div className={`card p-4 border-l-2 ${borderColor} space-y-4 animate-fade-in`}>
          {children}
        </div>
      )}
    </div>
  );
}

function ContactRow({ label, value, type }: { label: string; value?: string | null, type: 'phone' | 'email' }) {
  const [open, setOpen] = useState(false);
  
  if (!value) {
    return (
      <div className="flex items-start justify-between py-2 border-b border-zinc-800/30 last:border-0">
        <span className="text-xs text-zinc-500 flex-none w-28">{label}</span>
        <span className="text-sm text-zinc-600 text-right">—</span>
      </div>
    );
  }

  const items = value.split(',').map(item => item.trim()).filter(Boolean);
  if (items.length === 0) {
    return (
      <div className="flex items-start justify-between py-2 border-b border-zinc-800/30 last:border-0">
        <span className="text-xs text-zinc-500 flex-none w-28">{label}</span>
        <span className="text-sm text-zinc-600 text-right">—</span>
      </div>
    );
  }

  const firstItem = items[0];
  const remainingCount = items.length - 1;

  const getHref = (item: string) => {
    return type === 'phone' ? `tel:${item.replace(/[^\d+]/g, '')}` : `mailto:${item}`;
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-28 mt-0.5">{label}</span>
      <div className="flex items-center gap-2 relative">
        <a href={getHref(firstItem)} className="text-sm text-zinc-200 hover:text-primary-400 transition-colors break-all text-right">
          {firstItem}
        </a>
        
        {remainingCount > 0 && (
          <div className="relative">
            <button 
              onClick={() => setOpen(!open)}
              title={`View ${remainingCount} more`}
              className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none px-1 shadow-sm transition-colors cursor-pointer z-10"
            >
              +{remainingCount}
            </button>
            
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-max max-w-xs bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-fade-in text-left">
                  <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 border-b border-zinc-700/50 uppercase tracking-wider">
                    All {label}s
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {items.map((item, i) => (
                      <a 
                        key={i} 
                        href={getHref(item)} 
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors truncate"
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

function TechStackRow({ label, items }: { label: string; items?: string[] | null }) {
  const [open, setOpen] = useState(false);
  
  if (!items || items.length === 0) {
    return <Row label={label} value={null} />;
  }

  const visibleItems = items.slice(0, 4);
  const remainingCount = items.length - 4;

  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs text-zinc-500 flex-none w-28 mt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap justify-end relative">
        {visibleItems.map((tech, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{tech}</span>
        ))}
        
        {remainingCount > 0 && (
          <div className="relative">
            <button 
              onClick={() => setOpen(!open)}
              title={`View ${remainingCount} more`}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-md leading-none px-1 shadow-sm transition-colors cursor-pointer z-10 ml-0.5"
            >
              +{remainingCount}
            </button>
            
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-max max-w-[280px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in text-left">
                  <div className="px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-700/50 uppercase tracking-wider bg-zinc-800/80 sticky top-0">
                    All Tech Stack ({items.length})
                  </div>
                  <div className="p-3 max-h-48 overflow-y-auto flex flex-wrap gap-1.5">
                    {items.map((item, i) => (
                      <span key={i} className="text-[11px] px-2 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-700/50">
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

export default function LeadView({ lead, isOpen, onClose }: LeadViewProps) {
  const [leadDetail, setLeadDetail] = useState<Lead | null>(lead);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!isOpen || !lead) return null;
  const d = leadDetail || lead;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between flex-none gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-white truncate">{d.name}</h3>
              <span className="badge border-zinc-700 text-zinc-400">{STATUS_LABELS[d.status] || d.status}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {d.lid && <span className="badge border-primary-700 bg-primary-500/10 text-primary-400 text-[11px]">{d.lid}</span>}
              {d.campaign_id && <span className="badge border-amber-700 bg-amber-500/10 text-amber-400 text-[11px]">{d.campaign_id}</span>}
              {d.source && <span className="badge border-zinc-700 text-zinc-400 text-[11px]">{d.source}</span>}
              {d.classification && (
                <span className="badge border-violet-700 bg-violet-500/10 text-violet-400 text-[11px]">
                  {CLASSIFICATION_LABELS[d.classification] || d.classification}
                </span>
              )}
              {d.score != null && (
                <span className={`badge text-[11px] ${
                  d.score >= 70 ? 'border-emerald-700 bg-emerald-500/10 text-emerald-400'
                    : d.score >= 40 ? 'border-amber-700 bg-amber-500/10 text-amber-400'
                    : 'border-rose-700 bg-rose-500/10 text-rose-400'
                }`}>
                  {d.score}{d.score_label ? ` · ${d.score_label}` : ''}
                </span>
              )}
              {d.category && <span className="badge border-zinc-700 text-zinc-400 text-[11px]">{d.category}</span>}
              {d.rating != null && (
                <span className="badge border-zinc-700 text-zinc-400 text-[11px]">
                  <svg className="w-3 h-3 text-amber-400 inline -mt-0.5 mr-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {d.rating}{d.review_count != null ? ` (${d.review_count})` : ''}
                </span>
              )}
              {d.price_level && <span className="badge border-zinc-700 text-zinc-400 text-[11px]">{d.price_level}</span>}
            </div>

          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-150 flex-none">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Identification */}
              <div>
                <p className="section-label mb-2">Lead Info</p>
                <div className="card p-4">
                  <Row label="Stage" value={d.stage ? <span className="capitalize">{d.stage.replace(/_/g, ' ')}</span> : null} />
                  <Row label="Working Hours" value={d.working_hours} />
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="section-label mb-2">Contact</p>
                <div className="card p-4">
                  <ContactRow label="Company Phone" value={d.company_phone} type="phone" />
                  <ContactRow label="Company Email" value={d.company_email} type="email" />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="section-label mb-2">Address</p>
                <div className="card p-4">
                  <Row label="Full address" value={d.address} />
                  <Row label="Street" value={d.street_address} />
                  <Row label="Neighborhood" value={d.neighborhood} />
                  <Row label="City" value={d.city} />
                  <Row label="Postal code" value={d.postal_code} />
                  <CoordRow lat={d.latitude} lng={d.longitude} />
                </div>
              </div>

              {/* Links */}
              <div>
                <p className="section-label mb-2">Links</p>
                <div className="card p-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(() => {
                      const allLinks: { label: string; url: string; icon: React.ReactNode }[] = [];
                      if (d.website) allLinks.push({ label: 'Website', url: d.website, icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg> });
                      if (d.google_maps_url) allLinks.push({ label: 'Google Maps', url: d.google_maps_url, icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> });
                      if (d.facebook_url) allLinks.push({ label: 'Facebook', url: d.facebook_url, icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> });
                      if (d.twitter_url) allLinks.push({ label: 'X (Twitter)', url: d.twitter_url, icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> });
                      if (d.instagram_url) allLinks.push({ label: 'Instagram', url: d.instagram_url, icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> });
                      if (d.linkedin_url) allLinks.push({ label: 'LinkedIn', url: d.linkedin_url, icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg> });
                      if (d.youtube_url) allLinks.push({ label: 'YouTube', url: d.youtube_url, icon: <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg> });
                      
                      if (d.social_links) {
                        Object.entries(d.social_links).forEach(([key, val]) => {
                          const urls = Array.isArray(val) ? val : [val];
                          urls.forEach(url => {
                            if (typeof url === 'string' && url.trim().length > 0) {
                              const social = getSocialIcon(url);
                              if (social) {
                                allLinks.push({ label: social.label, url, icon: social.icon });
                              } else {
                                allLinks.push({ 
                                  label: key, 
                                  url, 
                                  icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.258a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364" /></svg> 
                                });
                              }
                            }
                          });
                        });
                      }

                      const grouped = allLinks.reduce((acc, link) => {
                        if (!acc[link.label]) {
                          acc[link.label] = { icon: link.icon, urls: new Set<string>() };
                        }
                        acc[link.label].urls.add(link.url);
                        return acc;
                      }, {} as Record<string, { icon: React.ReactNode; urls: Set<string> }>);

                      return Object.entries(grouped).flatMap(([label, { icon, urls }]) => {
                        const urlList = Array.from(urls);
                        if (label === 'Website' || label === 'Google Maps') {
                          return urlList.map((url, i) => <IconLink key={`${label}-${i}`} href={url} icon={icon} label={label} />);
                        }
                        
                        if (urlList.length === 1) {
                          return <IconLink key={label} href={urlList[0]} icon={icon} label={label} />;
                        }
                        return <MultiIconLink key={label} icon={icon} label={label} urls={urlList} />;
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Company Summary */}
              {d.crm_signals?.ai_consolidated_data?.company_summary && (
                <div>
                  <p className="section-label mb-2">Company Summary</p>
                  <div className="card p-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {d.crm_signals.ai_consolidated_data.company_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Apollo Company Data */}
              {d.raw_data?.apollo_company && (
                <div>
                  <p className="section-label mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Apollo Company Info
                  </p>
                  <div className="card p-4">
                    <Row label="Name" value={d.raw_data.apollo_company.name} />
                    <Row label="Industry" value={d.raw_data.apollo_company.industry} />
                    <Row label="Employees" value={d.raw_data.apollo_company.employees?.toString()} />
                    <Row label="Est. Revenue" value={d.raw_data.apollo_company.annual_revenue} />
                    <Row label="Founded" value={d.raw_data.apollo_company.founded_year?.toString()} />
                    <TechStackRow label="Tech Stack" items={d.raw_data.apollo_company.tech_stack} />
                  </div>
                </div>
              )}

              {/* Apollo Decision Makers */}
              {d.raw_data?.apollo_contacts && d.raw_data.apollo_contacts.length > 0 && (
                <div>
                  <p className="section-label mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Decision Makers
                  </p>
                  <div className="grid gap-3">
                    {d.raw_data.apollo_contacts.map((contact: any, idx: number) => (
                      <div key={idx} className="card p-4 border-l-2 border-l-emerald-500">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-100">{contact.first_name} {contact.last_name}</h4>
                            <p className="text-xs text-zinc-400">{contact.title}</p>
                          </div>
                          {contact.linkedin_url && (
                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-[#0a66c2] transition-colors">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                            </a>
                          )}
                        </div>
                        <div className="space-y-1">
                          <ContactRow label="Email" value={contact.email} type="email" />
                          {contact.phone_numbers && contact.phone_numbers.length > 0 ? (
                            contact.phone_numbers.map((num: string, i: number) => (
                              <ContactRow key={i} label={`Phone ${i+1}`} value={num} type="phone" />
                            ))
                          ) : (
                            <ContactRow label="Phone" value={null} type="phone" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {d.ai_reasoning && (
                <div>
                  <p className="section-label mb-2 flex items-center gap-2">
                    <svg className={`w-4 h-4 ${d.status === 'qualified' ? 'text-emerald-400' : 'text-rose-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI Qualification Reasoning
                  </p>
                  <div className={`card p-4 border-l-2 ${d.status === 'qualified' ? 'border-emerald-500' : 'border-rose-500'}`}>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.ai_reasoning}</p>
                  </div>
                </div>
              )}

              {/* AI Strategic Insights */}
              {d.insight && (
                <CollapsibleBlock 
                  label="AI Strategic Insights"
                  icon={<svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                  borderColor="border-fuchsia-500"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 mb-1">Pain Points</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.insight.pain_points}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 mb-1">Operational Gap</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.insight.operational_gap}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 mb-1">Opportunity</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.insight.opportunity}</p>
                  </div>
                </CollapsibleBlock>
              )}

              {/* Email Drafts */}
              {d.email_drafts && d.email_drafts.length > 0 && (
                <CollapsibleBlock 
                  label="Suggested Outreach"
                  icon={<svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  borderColor="border-blue-500"
                >
                  <div className="grid gap-3">
                    {d.email_drafts.map((draft, idx) => (
                      <div key={idx} className="card p-4 border-l-2 border-blue-500">
                        <div className="mb-3 pb-3 border-b border-zinc-800/50">
                          <p className="text-xs text-zinc-500 mb-1">Subject</p>
                          <p className="text-sm font-medium text-zinc-100">{draft.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Body</p>
                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{draft.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleBlock>
              )}

              {/* Notes */}
              {d.notes && (
                <div>
                  <p className="section-label mb-2">Notes</p>
                  <div className="card p-4">
                    <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{d.notes}</p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {d.tags && d.tags.length > 0 && (
                <div>
                  <p className="section-label mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.tags.map((tag, i) => (
                      <span key={i} className="badge border-zinc-700 text-zinc-400">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              {activities.length > 0 && (
                <div>
                  <p className="section-label mb-2">Activity History</p>
                  <div className="card divide-y divide-zinc-800/30">
                    {[...activities].reverse().map((a) => (
                      <div key={a.id} className="flex items-start justify-between px-4 py-3 first:pt-3 last:pb-3">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-300 capitalize">{a.activity_type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>
                        </div>
                        <span className="text-xs text-zinc-600 flex-none ml-4 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex gap-5 pt-1 flex-wrap border-t border-zinc-800/30 pt-4">
                {d.scraped_at && <span className="text-xs text-zinc-600">Scraped {new Date(d.scraped_at).toLocaleDateString()}</span>}
                {d.created_at && <span className="text-xs text-zinc-600">Created {new Date(d.created_at).toLocaleDateString()}</span>}
                {d.updated_at && <span className="text-xs text-zinc-600">Updated {new Date(d.updated_at).toLocaleDateString()}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
