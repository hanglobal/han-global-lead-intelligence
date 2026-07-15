'use client';

import { useState } from 'react';
import axios from 'axios';

interface CampaignFormProps {
  initialData?: {
    id: number;
    name: string;
    description: string;
    niche: string;
    location: string;
    lead_count: number | null;
  };
  onSuccess: () => void;
}

export default function CampaignForm({ initialData, onSuccess }: CampaignFormProps) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [niche, setNiche] = useState(initialData?.niche || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [leadCount, setLeadCount] = useState(initialData?.lead_count?.toString() || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        description: description.trim() || undefined,
        niche,
        location,
        lead_count: leadCount.trim() === '' ? null : parseInt(leadCount, 10),
      };
      if (isEdit && initialData) {
        await axios.patch(`/api/lead-hunter/campaigns/${initialData.id}/`, payload);
      } else {
        await axios.post('/api/lead-hunter/campaigns/', payload);
        setName(''); setDescription(''); setNiche(''); setLocation(''); setLeadCount('');
      }
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Campaign name <span className="text-rose-400">*</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="e.g. MIAMI DENTAL CLINICS Q3" className="input-field uppercase" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes about this campaign" rows={3} className="input-field resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Business niche <span className="text-rose-400">*</span></label>
        <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. real estate property management" className="input-field" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Location <span className="text-rose-400">*</span></label>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Miami, FL" className="input-field" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lead limit</label>
        <input type="number" value={leadCount} onChange={(e) => setLeadCount(e.target.value)} placeholder="Leave empty for max results" min="1" className="input-field" />
        <p className="text-xs text-zinc-500 mt-1.5">Leave empty to collect all available results</p>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update campaign' : 'Create campaign')}
      </button>
    </form>
  );
}
