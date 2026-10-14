'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface CampaignFormProps {
  initialData?: {
    id: number;
    name: string;
    description: string;
    niche: string;
    location: string;
    lead_count: number | null;
    actor_type?: string;
    filters?: Record<string, any>;
  };
  onSuccess: () => void;
}

// ── Interactive Tag Input (Type & Press Enter) ─────────────────────────
function TagField({
  tags,
  onChange,
  placeholder = 'Type and press enter...',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = val.trim().replace(/^,|,$/g, '');
      if (clean && !tags.includes(clean)) {
        onChange([...tags, clean]);
        setVal('');
      }
    } else if (e.key === 'Backspace' && !val && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-950/70 border border-zinc-800 rounded-lg min-h-[42px] focus-within:border-primary-500/80 focus-within:ring-1 focus-within:ring-primary-500/30 transition-all">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 text-zinc-200 font-medium select-none"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="text-zinc-400 hover:text-white font-bold ml-0.5 leading-none transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none px-1 py-0.5"
      />
    </div>
  );
}

// ── Searchable Multi-Select Dropdown with Inline Chips ─────────────────
function MultiSelectField({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((x) => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-950/70 border border-zinc-800 rounded-lg min-h-[42px] cursor-pointer hover:border-zinc-700 transition-all pr-8 relative"
      >
        {selected.length === 0 ? (
          <span className="text-xs text-zinc-500 italic px-1 py-0.5">
            {placeholder}
          </span>
        ) : (
          selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 text-zinc-200 font-medium select-none capitalize"
              onClick={(e) => e.stopPropagation()}
            >
              {item.replace(/_/g, ' ')}
              <button
                type="button"
                onClick={() => toggle(item)}
                className="text-zinc-400 hover:text-white font-bold ml-0.5 leading-none transition-colors"
              >
                ×
              </button>
            </span>
          ))
        )}

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <svg
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-zinc-900 border border-zinc-700/90 rounded-xl shadow-2xl p-2.5 space-y-2 max-h-56 overflow-y-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-md border border-zinc-700 px-3 py-1.5 focus:outline-none focus:border-primary-500"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-0.5">
            {filtered.map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`text-left text-xs px-3 py-1.5 rounded-md flex items-center justify-between capitalize transition-colors ${
                    active
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <span>{opt.replace(/_/g, ' ')}</span>
                  {active && <span className="text-primary-400 font-bold ml-2">✓</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-zinc-500 p-2 text-center">No options found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sleek Custom Single-Select Dropdown (Matching UI) ─────────────────
function SingleSelectField({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-lg min-h-[42px] text-xs text-left hover:border-zinc-700 focus:outline-none transition-all"
      >
        <span className={selectedOption?.value ? 'text-zinc-200 font-medium' : 'text-zinc-500 italic'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-zinc-900 border border-zinc-700/90 rounded-xl shadow-2xl p-1.5 max-h-56 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`text-left text-xs px-3 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <span className="text-primary-400 font-bold ml-2">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignForm({ initialData, onSuccess }: CampaignFormProps) {
  const isEdit = !!initialData;

  // ── General Info ──────────────────────────────────────────────────────
  const [name, setName] = useState(initialData?.name || '');
  const [leadLimit, setLeadLimit] = useState(
    initialData?.lead_count ? Math.min(1000, Math.max(250, initialData.lead_count)).toString() : '250'
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [formError, setFormError] = useState<string | null>(null);

  // ── Audience & Location ───────────────────────────────────────────────
  const [targetLocations, setTargetLocations] = useState<string[]>(
    Array.isArray(initialData?.filters?.contact_location)
      ? initialData.filters.contact_location
      : initialData?.location
      ? [initialData.location]
      : ['United States']
  );
  const [excludedLocations, setExcludedLocations] = useState<string[]>(
    Array.isArray(initialData?.filters?.contact_not_location)
      ? initialData.filters.contact_not_location
      : []
  );

  const [targetCities, setTargetCities] = useState<string[]>(
    Array.isArray(initialData?.filters?.contact_city)
      ? initialData.filters.contact_city
      : []
  );
  const [excludedCities, setExcludedCities] = useState<string[]>(
    Array.isArray(initialData?.filters?.contact_not_city)
      ? initialData.filters.contact_not_city
      : []
  );

  const [seniorityLevel, setSeniorityLevel] = useState<string[]>(
    initialData?.filters?.seniority_level || ['founder', 'owner', 'c_suite', 'director', 'partner', 'vp', 'head']
  );
  const [functionalLevel, setFunctionalLevel] = useState<string[]>(
    initialData?.filters?.functional_level || ['c_suite', 'operations', 'engineering', 'sales', 'marketing']
  );

  const [targetJobTitles, setTargetJobTitles] = useState<string[]>(
    Array.isArray(initialData?.filters?.contact_job_title)
      ? initialData.filters.contact_job_title
      : ['CEO', 'Chief Executive Officer', 'COO', 'President', 'Vice President', 'Principle', 'Director']
  );
  const [excludedJobTitles, setExcludedJobTitles] = useState<string[]>(
    Array.isArray(initialData?.filters?.contact_not_job_title)
      ? initialData.filters.contact_not_job_title
      : ['Manager', 'Assistant', 'Trainee', 'Receptionist', 'Intern']
  );

  // ── Company Criteria ──────────────────────────────────────────────────
  const [companyIndustries, setCompanyIndustries] = useState<string[]>(
    Array.isArray(initialData?.filters?.company_industry)
      ? initialData.filters.company_industry
      : initialData?.niche
      ? [initialData.niche]
      : ['real estate', 'commercial real estate']
  );
  const [excludedIndustries, setExcludedIndustries] = useState<string[]>(
    Array.isArray(initialData?.filters?.company_not_industry)
      ? initialData.filters.company_not_industry
      : []
  );

  const [companyKeywords, setCompanyKeywords] = useState<string[]>(
    Array.isArray(initialData?.filters?.company_keywords)
      ? initialData.filters.company_keywords
      : ['Property Management', 'Real Estate', 'B2B', 'SaaS']
  );
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>(
    Array.isArray(initialData?.filters?.company_not_keywords)
      ? initialData.filters.company_not_keywords
      : []
  );

  const [companySizes, setCompanySizes] = useState<string[]>(
    initialData?.filters?.size || ['11-20', '21-50', '51-100', '101-200']
  );
  const [emailStatus, setEmailStatus] = useState<string[]>(
    initialData?.filters?.email_status || ['validated']
  );

  const [minRevenue, setMinRevenue] = useState(initialData?.filters?.min_revenue || '');
  const [maxRevenue, setMaxRevenue] = useState(initialData?.filters?.max_revenue || '');

  const [funding, setFunding] = useState<string[]>(
    initialData?.filters?.funding || []
  );
  const [companyDomains, setCompanyDomains] = useState<string[]>(
    Array.isArray(initialData?.filters?.company_domain)
      ? initialData.filters.company_domain
      : []
  );

  // ── Dynamic API Filters ───────────────────────────────────────────────
  const [availableLocations, setAvailableLocations] = useState<string[]>([
    'United States',
    'California, US',
    'Texas, US',
    'Florida, US',
    'New York, US',
    'Illinois, US',
    'England, United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
  ]);

  const [availableSeniorities, setAvailableSeniorities] = useState<string[]>([
    'founder',
    'owner',
    'c_suite',
    'director',
    'partner',
    'vp',
    'head',
    'manager',
    'senior',
    'entry',
    'trainee',
  ]);

  const [availableFunctionals, setAvailableFunctionals] = useState<string[]>([
    'c_suite',
    'engineering',
    'sales',
    'marketing',
    'operations',
    'finance',
    'human_resources',
    'legal',
    'product_management',
    'design',
    'support',
  ]);

  const [availableIndustries, setAvailableIndustries] = useState<string[]>([
    'information technology & services',
    'construction',
    'marketing & advertising',
    'real estate',
    'commercial real estate',
    'health, wellness & fitness',
    'management consulting',
    'computer software',
    'internet',
    'retail',
    'financial services',
    'consumer services',
    'hospital & health care',
    'automotive',
    'restaurants',
    'education management',
    'food & beverages',
    'design',
    'hospitality',
    'accounting',
    'telecommunications',
  ]);

  const [availableSizes, setAvailableSizes] = useState<string[]>([
    '1-10',
    '11-20',
    '21-50',
    '51-100',
    '101-200',
    '201-500',
    '501-1000',
    '1001-2000',
    '2001-5000',
    '5001-10000',
    '10001-20000',
    '50000+',
  ]);

  const [availableFunding, setAvailableFunding] = useState<string[]>([
    'seed',
    'angel',
    'series_a',
    'series_b',
    'series_c',
    'series_d',
    'series_e',
    'series_f',
    'venture_round',
    'debt_financing',
    'convertible_note',
    'private_equity_round',
  ]);

  const minRevenueOptions = [
    { label: 'Any Min Revenue', value: '' },
    { label: '$500K', value: '500K' },
    { label: '$1M', value: '1M' },
    { label: '$2M', value: '2M' },
    { label: '$5M', value: '5M' },
    { label: '$10M', value: '10M' },
    { label: '$25M', value: '25M' },
    { label: '$50M', value: '50M' },
    { label: '$100M', value: '100M' },
    { label: '$250M', value: '250M' },
    { label: '$500M', value: '500M' },
    { label: '$1B', value: '1B' },
  ];

  const maxRevenueOptions = [
    { label: 'Any Max Revenue', value: '' },
    { label: '$500K', value: '500K' },
    { label: '$1M', value: '1M' },
    { label: '$2M', value: '2M' },
    { label: '$5M', value: '5M' },
    { label: '$10M', value: '10M' },
    { label: '$25M', value: '25M' },
    { label: '$50M', value: '50M' },
    { label: '$100M', value: '100M' },
    { label: '$250M', value: '250M' },
    { label: '$500M', value: '500M' },
    { label: '$1B', value: '1B' },
  ];

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Fetch dynamic choices from backend filters endpoint
    axios
      .get('/api/lead-hunter/nexus/filters/')
      .then((res) => {
        if (res.data) {
          if (Array.isArray(res.data.seniority_level)) setAvailableSeniorities(res.data.seniority_level);
          if (Array.isArray(res.data.functional_level)) setAvailableFunctionals(res.data.functional_level);
          if (Array.isArray(res.data.company_industry)) setAvailableIndustries(res.data.company_industry);
          if (Array.isArray(res.data.company_size)) setAvailableSizes(res.data.company_size);
          if (Array.isArray(res.data.funding)) setAvailableFunding(res.data.funding);
        }
      })
      .catch(() => {});

    // 2. Pre-populate filters from the latest campaign when creating a new campaign
    if (!initialData) {
      axios
        .get('/api/lead-hunter/campaigns/')
        .then((res) => {
          const campaigns = res.data || [];
          if (campaigns.length > 0) {
            const lastCampaign = campaigns[0];
            const filters = lastCampaign.filters || {};

            if (Array.isArray(filters.contact_location) && filters.contact_location.length > 0) {
              setTargetLocations(filters.contact_location);
            }
            if (Array.isArray(filters.contact_not_location)) setExcludedLocations(filters.contact_not_location);
            if (Array.isArray(filters.contact_city)) setTargetCities(filters.contact_city);
            if (Array.isArray(filters.contact_not_city)) setExcludedCities(filters.contact_not_city);

            if (Array.isArray(filters.seniority_level) && filters.seniority_level.length > 0) {
              setSeniorityLevel(filters.seniority_level);
            }
            if (Array.isArray(filters.functional_level)) setFunctionalLevel(filters.functional_level);

            if (Array.isArray(filters.contact_job_title) && filters.contact_job_title.length > 0) {
              setTargetJobTitles(filters.contact_job_title);
            }
            if (Array.isArray(filters.contact_not_job_title)) setExcludedJobTitles(filters.contact_not_job_title);

            if (Array.isArray(filters.company_industry) && filters.company_industry.length > 0) {
              setCompanyIndustries(filters.company_industry);
            } else if (lastCampaign.niche) {
              setCompanyIndustries([lastCampaign.niche]);
            }
            if (Array.isArray(filters.company_not_industry)) setExcludedIndustries(filters.company_not_industry);

            if (Array.isArray(filters.company_keywords)) setCompanyKeywords(filters.company_keywords);
            if (Array.isArray(filters.company_not_keywords)) setExcludedKeywords(filters.company_not_keywords);

            if (Array.isArray(filters.size) && filters.size.length > 0) setCompanySizes(filters.size);
            if (Array.isArray(filters.email_status)) setEmailStatus(filters.email_status);

            if (filters.min_revenue) setMinRevenue(filters.min_revenue);
            if (filters.max_revenue) setMaxRevenue(filters.max_revenue);
            if (Array.isArray(filters.funding)) setFunding(filters.funding);
            if (Array.isArray(filters.company_domain)) setCompanyDomains(filters.company_domain);
          }
        })
        .catch(() => {});
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      setFormError(null);
      const parsedLimit = parseInt(leadLimit, 10);
      const finalLeadCount = isNaN(parsedLimit) || parsedLimit < 250 ? 250 : Math.min(1000, parsedLimit);

      const filters: Record<string, any> = {
        contact_job_title: targetJobTitles.length > 0 ? targetJobTitles : undefined,
        contact_not_job_title: excludedJobTitles.length > 0 ? excludedJobTitles : undefined,
        seniority_level: seniorityLevel.length > 0 ? seniorityLevel : undefined,
        functional_level: functionalLevel.length > 0 ? functionalLevel : undefined,
        company_industry: companyIndustries.length > 0 ? companyIndustries : undefined,
        company_not_industry: excludedIndustries.length > 0 ? excludedIndustries : undefined,
        size: companySizes.length > 0 ? companySizes : undefined,
        company_keywords: companyKeywords.length > 0 ? companyKeywords : undefined,
        company_not_keywords: excludedKeywords.length > 0 ? excludedKeywords : undefined,
        contact_location: targetLocations.length > 0 ? targetLocations : undefined,
        contact_not_location: excludedLocations.length > 0 ? excludedLocations : undefined,
        contact_city: targetCities.length > 0 ? targetCities : undefined,
        contact_not_city: excludedCities.length > 0 ? excludedCities : undefined,
        company_domain: companyDomains.length > 0 ? companyDomains : undefined,
        funding: funding.length > 0 ? funding : undefined,
        min_revenue: minRevenue.trim() ? minRevenue : undefined,
        max_revenue: maxRevenue.trim() ? maxRevenue : undefined,
        email_status: emailStatus.length > 0 ? emailStatus : ['validated'],
      };

      const payload = {
        name,
        description: description.trim() || undefined,
        niche: companyIndustries.join(', ') || 'B2B',
        location: targetLocations.join(', '),
        lead_count: finalLeadCount,
        actor_type: 'nexus',
        filters: filters,
      };

      if (isEdit && initialData) {
        await axios.patch(`/api/lead-hunter/campaigns/${initialData.id}/`, payload);
      } else {
        await axios.post('/api/lead-hunter/campaigns/', payload);
      }
      onSuccess();
    } catch (e: any) {
      console.error('Failed to save campaign:', e);
      const msg = e.response?.data?.error || e.message || 'Failed to save campaign';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-zinc-200">
      {formError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{formError}</span>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* ── 1. General Info ────────────────────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          General Info
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Campaign Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="E.g. Q3 Tech Founders"
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Lead Limit <span className="text-primary-400 font-normal">(Min 250 – Max 1,000)</span>
              </label>
            </div>
            <input
              type="number"
              value={leadLimit}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setLeadLimit('');
                  return;
                }
                const num = parseInt(raw, 10);
                if (!isNaN(num)) {
                  if (num > 1000) {
                    setLeadLimit('1000');
                  } else {
                    setLeadLimit(raw);
                  }
                }
              }}
              onBlur={() => {
                const val = parseInt(leadLimit, 10);
                if (isNaN(val) || val < 250) {
                  setLeadLimit('250');
                } else if (val > 1000) {
                  setLeadLimit('1000');
                }
              }}
              placeholder="250"
              min="250"
              max="1000"
              step="50"
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500 font-mono"
            />
            {leadLimit.trim() !== '' && parseInt(leadLimit, 10) < 250 && (
              <p className="text-[10px] text-amber-400 mt-1">
                Minimum is 250 leads. Values below 250 will automatically default to 250.
              </p>
            )}
            {leadLimit.trim() !== '' && parseInt(leadLimit, 10) >= 1000 && (
              <p className="text-[10px] text-zinc-400 mt-1">
                Maximum limit of 1,000 leads reached.
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800/80" />

      {/* ── 2. Audience & Location ──────────────────────────────────── */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Audience & Location
        </h4>

        {/* Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Target Locations
            </label>
            <MultiSelectField
              options={availableLocations}
              selected={targetLocations}
              onChange={setTargetLocations}
              placeholder="Select target locations..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Excluded Locations
            </label>
            <MultiSelectField
              options={availableLocations}
              selected={excludedLocations}
              onChange={setExcludedLocations}
              placeholder="Locations to skip..."
            />
          </div>
        </div>

        {/* Cities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Target Cities
            </label>
            <TagField
              tags={targetCities}
              onChange={setTargetCities}
              placeholder="Type city and press enter..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Excluded Cities
            </label>
            <TagField
              tags={excludedCities}
              onChange={setExcludedCities}
              placeholder="Type city and press enter..."
            />
          </div>
        </div>

        {/* Seniority & Functional Levels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Seniority Level
            </label>
            <MultiSelectField
              options={availableSeniorities}
              selected={seniorityLevel}
              onChange={setSeniorityLevel}
              placeholder="Select seniority..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Functional Level
            </label>
            <MultiSelectField
              options={availableFunctionals}
              selected={functionalLevel}
              onChange={setFunctionalLevel}
              placeholder="Select departments..."
            />
          </div>
        </div>

        {/* Job Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Target Job Titles
            </label>
            <TagField
              tags={targetJobTitles}
              onChange={setTargetJobTitles}
              placeholder="Type job title and press enter..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Excluded Job Titles
            </label>
            <TagField
              tags={excludedJobTitles}
              onChange={setExcludedJobTitles}
              placeholder="Type job title and press enter..."
            />
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800/80" />

      {/* ── 3. Company Criteria ─────────────────────────────────────── */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Company Criteria
        </h4>

        {/* Industries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Company Industries
            </label>
            <MultiSelectField
              options={availableIndustries}
              selected={companyIndustries}
              onChange={setCompanyIndustries}
              placeholder="Select industries..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Excluded Industries
            </label>
            <MultiSelectField
              options={availableIndustries}
              selected={excludedIndustries}
              onChange={setExcludedIndustries}
              placeholder="Select industries to exclude..."
            />
          </div>
        </div>

        {/* Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Company Keywords
            </label>
            <TagField
              tags={companyKeywords}
              onChange={setCompanyKeywords}
              placeholder="Type keyword and press enter..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Excluded Keywords
            </label>
            <TagField
              tags={excludedKeywords}
              onChange={setExcludedKeywords}
              placeholder="Type keyword and press enter..."
            />
          </div>
        </div>

        {/* Size & Email Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Company Size
            </label>
            <MultiSelectField
              options={availableSizes}
              selected={companySizes}
              onChange={setCompanySizes}
              placeholder="Select size ranges..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Status
            </label>
            <MultiSelectField
              options={['validated', 'unvalidated']}
              selected={emailStatus}
              onChange={setEmailStatus}
              placeholder="Select email status..."
            />
          </div>
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Min Revenue
            </label>
            <SingleSelectField
              options={minRevenueOptions}
              value={minRevenue}
              onChange={setMinRevenue}
              placeholder="Any Min Revenue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Max Revenue
            </label>
            <SingleSelectField
              options={maxRevenueOptions}
              value={maxRevenue}
              onChange={setMaxRevenue}
              placeholder="Any Max Revenue"
            />
          </div>
        </div>

        {/* Funding & Domains */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Funding
            </label>
            <MultiSelectField
              options={availableFunding}
              selected={funding}
              onChange={setFunding}
              placeholder="Select funding..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Specific Company Domains (Optional)
            </label>
            <TagField
              tags={companyDomains}
              onChange={setCompanyDomains}
              placeholder="e.g. apple.com, google.com..."
            />
          </div>
        </div>
      </div>

      {/* ── Submit CTA Button (Han Global Primary Blue Theme) ───────── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary-500/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? 'Saving Changes...'
              : 'Creating Campaign...'
            : isEdit
            ? 'Update Campaign'
            : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
