'use client';

import React from 'react';
import { formatEasternDateTime } from '@/lib/dateUtils';

interface ColumnDef {
  header: string;
  getValue: (l: any) => any;
}

interface CRMExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  totalFilteredCount: number;
  leadsToExport: any[];
}

export default function CRMExportModal({
  isOpen,
  onClose,
  selectedCount,
  totalFilteredCount,
  leadsToExport,
}: CRMExportModalProps) {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    const columns: ColumnDef[] = [
      // ── 1. Identifiers & Pipeline Status ────────────────────────────────────
      { header: 'id', getValue: l => l.id },
      { header: 'lid', getValue: l => l.lid || '' },
      { header: 'place_id', getValue: l => l.place_id || '' },
      { header: 'fid', getValue: l => l.fid || '' },
      { header: 'source', getValue: l => l.source || '' },
      { header: 'campaign_id', getValue: l => l.campaign_id || '' },
      { header: 'source_campaign_id', getValue: l => l.source_campaign_id || '' },
      { header: 'status', getValue: l => l.status || '' },
      { header: 'stage', getValue: l => l.stage || '' },
      { header: 'classification', getValue: l => l.classification || '' },
      { header: 'tags', getValue: l => Array.isArray(l.tags) ? l.tags.join(', ') : (l.tags || '') },

      // ── 2. Company Firmographics (Nexus B2B & Web) ──────────────────────────
      { header: 'company_name', getValue: l => l.company_name || '' },
      { header: 'industry', getValue: l => l.industry || '' },
      { header: 'company_domain', getValue: l => l.company_domain || '' },
      { header: 'company_website', getValue: l => l.company_website || '' },
      { header: 'company_phone', getValue: l => l.company_phone || '' },
      { header: 'company_email', getValue: l => l.company_email || '' },
      { header: 'effective_email', getValue: l => l.effective_email || (l.decision_maker?.personal_email || l.decision_maker?.email || l.company_email || '') },
      { header: 'company_linkedin', getValue: l => l.company_linkedin || '' },
      { header: 'company_size', getValue: l => l.company_size || '' },
      { header: 'company_annual_revenue', getValue: l => l.company_annual_revenue || '' },
      { header: 'company_annual_revenue_clean', getValue: l => l.company_annual_revenue_clean || '' },
      { header: 'company_total_funding', getValue: l => l.company_total_funding || '' },
      { header: 'company_total_funding_clean', getValue: l => l.company_total_funding_clean || '' },
      { header: 'company_technologies', getValue: l => Array.isArray(l.company_technologies) ? l.company_technologies.join(', ') : (l.company_technologies || '') },
      { header: 'keywords', getValue: l => l.keywords || '' },
      { header: 'company_description', getValue: l => l.company_description || '' },
      { header: 'company_summary', getValue: l => l.company_summary || (l.crm_signals as any)?.company_summary || (l.crm_signals as any)?.ai_consolidated_data?.company_summary || '' },
      { header: 'rating', getValue: l => l.rating ?? '' },
      { header: 'review_count', getValue: l => l.review_count ?? '' },
      { header: 'price_level', getValue: l => l.price_level || '' },
      { header: 'working_hours', getValue: l => l.working_hours || '' },

      // ── 3. Address & Geographical Info ───────────────────────────────────────
      { header: 'company_full_address', getValue: l => l.company_full_address || '' },
      { header: 'company_street_address', getValue: l => l.company_street_address || '' },
      { header: 'neighborhood', getValue: l => l.neighborhood || '' },
      { header: 'city', getValue: l => l.city || '' },
      { header: 'state', getValue: l => l.state || '' },
      { header: 'country', getValue: l => l.country || '' },
      { header: 'company_postal_code', getValue: l => l.company_postal_code || '' },
      { header: 'latitude', getValue: l => l.latitude ?? '' },
      { header: 'longitude', getValue: l => l.longitude ?? '' },
      { header: 'google_maps_url', getValue: l => l.google_maps_url || '' },

      // ── 4. Social Links ─────────────────────────────────────────────────────
      { header: 'facebook_url', getValue: l => l.facebook_url || '' },
      { header: 'twitter_url', getValue: l => l.twitter_url || '' },
      { header: 'instagram_url', getValue: l => l.instagram_url || '' },
      { header: 'youtube_url', getValue: l => l.youtube_url || '' },

      // ── 5. Decision Maker Direct Information ─────────────────────────────────
      { header: 'dm_full_name', getValue: l => l.decision_maker?.full_name || '' },
      { header: 'dm_first_name', getValue: l => l.decision_maker?.first_name || '' },
      { header: 'dm_last_name', getValue: l => l.decision_maker?.last_name || '' },
      { header: 'dm_job_title', getValue: l => l.decision_maker?.job_title || '' },
      { header: 'dm_headline', getValue: l => l.decision_maker?.headline || '' },
      { header: 'dm_seniority', getValue: l => l.decision_maker?.seniority_level || '' },
      { header: 'dm_functional', getValue: l => l.decision_maker?.functional_level || '' },
      { header: 'dm_work_email', getValue: l => l.decision_maker?.email || '' },
      { header: 'dm_personal_email', getValue: l => l.decision_maker?.personal_email || '' },
      { header: 'dm_mobile_phone', getValue: l => l.decision_maker?.mobile_number || '' },
      { header: 'dm_linkedin', getValue: l => l.decision_maker?.linkedin || '' },
      { header: 'dm_city', getValue: l => l.decision_maker?.city || '' },
      { header: 'dm_state', getValue: l => l.decision_maker?.state || '' },
      { header: 'dm_country', getValue: l => l.decision_maker?.country || '' },
      { header: 'all_decision_makers', getValue: l => {
        if (!l.company_people || l.company_people.length === 0) return '';
        return l.company_people.map((p: any) => `${p.full_name} (${p.job_title || 'N/A'}, ${p.email || p.personal_email || 'No email'})`).join('; ');
      }},

      // ── 6. Rich LinkedIn Profile Data (Nexus LINKEDIN) ───────────────────────
      { header: 'linkedin_profile_url', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        if (!lp) return l.decision_maker?.linkedin || '';
        if (typeof lp === 'string') return lp;
        return lp.profile_url || lp.url || lp.linkedin || l.decision_maker?.linkedin || '';
      }},
      { header: 'linkedin_headline', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? lp.headline : null) || l.decision_maker?.headline || '';
      }},
      { header: 'linkedin_bio', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? (lp.summary || lp.about) : null) || (l.decision_maker as any)?.about || '';
      }},
      { header: 'linkedin_registered_at', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? (lp.registered_at ? formatEasternDateTime(lp.registered_at) : '') : '') || '';
      }},
      { header: 'linkedin_followers_count', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? (lp.follower_count ?? lp.followers_count ?? '') : '') || '';
      }},
      { header: 'linkedin_connections_count', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? (lp.connections_count ?? lp.connection_count ?? '') : '') || '';
      }},
      { header: 'linkedin_is_premium', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.is_premium) : false) || Boolean((l.decision_maker as any)?.is_premium) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_is_influencer', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.is_influencer) : false) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_is_creator', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.is_creator) : false) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_is_open_to_work', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.is_open_to_work) : false) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_is_hiring', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.is_hiring) : false) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_verified', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.verified) : false) || Boolean((l.decision_maker as any)?.verified) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_is_advertiser', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? Boolean(lp.isAdvertisement || lp.is_advertiser || lp.is_paid_advertiser) : false) || Boolean((l.raw_data as any)?.isAdvertisement) ? 'Yes' : 'No';
      }},
      { header: 'linkedin_skills', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        if (typeof lp === 'object' && lp && lp.skills) {
          return Array.isArray(lp.skills) ? lp.skills.map((s: any) => typeof s === 'string' ? s : s.name || JSON.stringify(s)).join(', ') : String(lp.skills);
        }
        return '';
      }},
      { header: 'linkedin_languages', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        if (typeof lp === 'object' && lp && Array.isArray(lp.languages)) {
          return lp.languages.map((lng: any) => typeof lng === 'string' ? lng : lng.name || lng.language || '').filter(Boolean).join(', ');
        }
        return '';
      }},
      { header: 'linkedin_certifications', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        if (typeof lp === 'object' && lp && Array.isArray(lp.certifications)) {
          return lp.certifications.map((c: any) => `${c.title || ''}${c.issuedBy ? ` (${c.issuedBy})` : ''}${c.issuedAt ? ` [${c.issuedAt}]` : ''}`).filter(Boolean).join('; ');
        }
        return '';
      }},
      { header: 'linkedin_experience', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        const exps = (typeof lp === 'object' && lp) ? (lp.experience_history || lp.experience) : null;
        if (Array.isArray(exps)) {
          return exps.map((e: any) => {
            const pos = e.position || e.title || '';
            const comp = e.companyName || e.company_name || e.company || '';
            const dates = e.startDate?.text ? `${e.startDate.text} - ${e.endDate?.text || 'Present'}` : '';
            return `${pos}${comp ? ` at ${comp}` : ''}${dates ? ` (${dates})` : ''}`;
          }).join('; ');
        }
        return '';
      }},
      { header: 'linkedin_education', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        const edus = (typeof lp === 'object' && lp) ? (lp.education_history || lp.education) : null;
        if (Array.isArray(edus)) {
          return edus.map((e: any) => {
            const sch = e.schoolName || e.school_name || e.school || '';
            const deg = e.degree || e.degreeName || '';
            const field = e.fieldOfStudy || e.field_of_study || '';
            return `${sch}${deg ? ` - ${deg}` : ''}${field ? ` in ${field}` : ''}`;
          }).join('; ');
        }
        return '';
      }},
      { header: 'linkedin_profile_image_url', getValue: l => {
        const lp = l.linkedin_profile || (l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile;
        return (typeof lp === 'object' && lp ? lp.profile_image_url : null) || (l.decision_maker as any)?.profile_image_url || '';
      }},

      // ── 7. Rich LinkedIn Posts Data (Nexus LINKEDIN_POST) ───────────────────
      { header: 'linkedin_posts_count', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        return Array.isArray(posts) ? posts.length : 0;
      }},
      { header: 'latest_post_content', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        const p = posts[0];
        return typeof p === 'string' ? p : (p.content || p.text || '');
      }},
      { header: 'latest_post_date', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        const rawDate = posts[0].posted_at || posts[0].postedAt || posts[0].date || '';
        return rawDate ? formatEasternDateTime(rawDate) : '';
      }},
      { header: 'latest_post_likes', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        return posts[0].likes ?? 0;
      }},
      { header: 'latest_post_comments', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        return posts[0].comments ?? 0;
      }},
      { header: 'latest_post_shares', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        return posts[0].shares ?? 0;
      }},
      { header: 'latest_post_url', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        return posts[0].postUrl || posts[0].post_url || posts[0].url || posts[0].linkedin_url || '';
      }},
      { header: 'linkedin_all_posts_summary', getValue: l => {
        const posts = l.linkedin_posts || (l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || [];
        if (!Array.isArray(posts) || posts.length === 0) return '';
        return posts.map((p: any, idx: number) => {
          if (typeof p === 'string') return `[Post ${idx + 1}]: ${p}`;
          const text = p.text || p.content || '';
          const rawDate = p.posted_at || p.postedAt || p.date || '';
          const dateStr = rawDate ? formatEasternDateTime(rawDate) : '';
          const likes = p.likes ?? 0;
          const comments = p.comments ?? 0;
          const shares = p.shares ?? 0;
          return `[Post ${idx + 1}${dateStr ? ` (${dateStr})` : ''} | Likes: ${likes}, Comments: ${comments}, Reposts: ${shares}]: ${text}`.trim();
        }).join(' | ');
      }},

      // ── 8. AI ICP Intelligence & Scoring ─────────────────────────────────
      { header: 'score', getValue: l => l.score ?? '' },
      { header: 'score_label', getValue: l => l.score_label || '' },
      { header: 'score_reasons', getValue: l => Array.isArray(l.score_reasons) ? l.score_reasons.join('; ') : (l.score_reasons || '') },
      { header: 'ai_reasoning', getValue: l => l.ai_reasoning || (l.crm_signals as any)?.ai_consolidated_data?.qualification_reasoning || '' },
      { header: 'pain_points', getValue: l => l.insight?.pain_points || (l.crm_signals as any)?.ai_consolidated_data?.insights?.pain_points || '' },
      { header: 'operational_gap', getValue: l => l.insight?.operational_gap || (l.crm_signals as any)?.ai_consolidated_data?.insights?.operational_gap || '' },
      { header: 'opportunity', getValue: l => l.insight?.opportunity || (l.crm_signals as any)?.ai_consolidated_data?.insights?.opportunity || '' },
      { header: 'sales_brief', getValue: l => l.sales_brief || '' },
      { header: 'why_now', getValue: l => l.why_now || '' },
      { header: 'recommended_service', getValue: l => l.recommended_service || '' },

      // ── 9. Cold Email Pitch Drafts ───────────────────────────────────────
      { header: 'cold_email_subject', getValue: l => {
        if (l.email_drafts && l.email_drafts.length > 0) return l.email_drafts[0].subject || '';
        return (l.crm_signals as any)?.ai_consolidated_data?.email_draft?.subject || '';
      }},
      { header: 'cold_email_body', getValue: l => {
        if (l.email_drafts && l.email_drafts.length > 0) return l.email_drafts[0].body || '';
        return (l.crm_signals as any)?.ai_consolidated_data?.email_draft?.body || '';
      }},

      // ── 10. Sales CRM & Follow-up Actions ────────────────────────────────
      { header: 'follow_up_date', getValue: l => l.follow_up_date || '' },
      { header: 'follow_up_time', getValue: l => l.follow_up_time || '' },
      { header: 'follow_up_status', getValue: l => l.follow_up_status || '' },
      { header: 'follow_up_priority', getValue: l => l.follow_up_priority || '' },
      { header: 'follow_up_action_type', getValue: l => l.follow_up_action_type || '' },
      { header: 'follow_up_notes', getValue: l => l.follow_up_notes || '' },
      { header: 'last_contacted_at', getValue: l => l.last_contacted_at || '' },
      { header: 'notes', getValue: l => l.notes || '' },

      // ── 11. Platform Timestamps ──────────────────────────────────────────
      { header: 'scraped_at', getValue: l => l.scraped_at || '' },
      { header: 'scraped_at_eastern', getValue: l => l.scraped_at ? formatEasternDateTime(l.scraped_at) : '' },
      { header: 'created_at', getValue: l => l.created_at || '' },
      { header: 'created_at_eastern', getValue: l => l.created_at ? formatEasternDateTime(l.created_at) : '' },
      { header: 'updated_at', getValue: l => l.updated_at || '' },
      { header: 'updated_at_eastern', getValue: l => l.updated_at ? formatEasternDateTime(l.updated_at) : '' },
    ];

    const headers = columns.map(c => c.header);
    const rows = leadsToExport.map(l => {
      return columns.map(col => {
        const val = col.getValue(l);
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    a.download = `leads_export_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.csv`;
    
    a.click();
    onClose();
  };

  const handleExportJSON = () => {
    const exportData = leadsToExport.map(l => {
      const lp: any = (typeof l.linkedin_profile === 'object' && l.linkedin_profile)
        ? l.linkedin_profile 
        : ((l.crm_signals as any)?.linkedin_profile || (l.raw_data as any)?.nexus_linkedin_profile || (l.raw_data as any)?.linkedin_profile || {});

      const posts: any[] = Array.isArray(l.linkedin_posts) && l.linkedin_posts.length > 0 
        ? l.linkedin_posts 
        : ((l.crm_signals as any)?.linkedin_posts || (l.raw_data as any)?.nexus_linkedin_posts || []);

      const dm: any = l.decision_maker || l.company_people?.[0] || {};
      
      const item: Record<string, any> = {
        // 1. Identifiers & Status
        id: l.id,
        lid: l.lid,
        place_id: l.place_id,
        fid: l.fid,
        source: l.source,
        campaign_id: l.campaign_id,
        source_campaign_id: l.source_campaign_id,
        status: l.status,
        stage: l.stage,
        classification: l.classification,
        tags: l.tags || [],

        // 2. Company Firmographics (Nexus B2B & Web)
        company_name: l.company_name,
        industry: l.industry,
        company_domain: l.company_domain,
        company_website: l.company_website,
        company_phone: l.company_phone,
        company_email: l.company_email,
        effective_email: l.effective_email || (dm.personal_email || dm.email || l.company_email || ''),
        company_linkedin: l.company_linkedin,
        company_size: l.company_size,
        company_annual_revenue: l.company_annual_revenue,
        company_annual_revenue_clean: l.company_annual_revenue_clean,
        company_total_funding: l.company_total_funding,
        company_total_funding_clean: l.company_total_funding_clean,
        company_technologies: l.company_technologies || [],
        keywords: l.keywords,
        company_description: l.company_description,
        company_summary: l.company_summary || (l.crm_signals as any)?.company_summary || (l.crm_signals as any)?.ai_consolidated_data?.company_summary || '',
        rating: l.rating,
        review_count: l.review_count,
        price_level: l.price_level,
        working_hours: l.working_hours,

        // 3. Address & Location
        company_full_address: l.company_full_address,
        company_street_address: l.company_street_address,
        neighborhood: l.neighborhood,
        city: l.city,
        state: l.state,
        country: l.country,
        company_postal_code: l.company_postal_code,
        latitude: l.latitude,
        longitude: l.longitude,
        google_maps_url: l.google_maps_url,

        // 4. Social Links
        social_links: {
          facebook: l.facebook_url || null,
          twitter: l.twitter_url || null,
          instagram: l.instagram_url || null,
          youtube: l.youtube_url || null,
        },

        // 5. Decision Maker & People
        decision_maker: dm,
        company_people: l.company_people || (dm && dm.full_name ? [dm] : []),

        // 6. Complete LinkedIn Profile Data (0% Loss)
        linkedin_profile: {
          profile_url: lp.linkedin || lp.url || dm.linkedin || '',
          full_name: lp.full_name || dm.full_name || '',
          headline: lp.headline || dm.headline || '',
          summary: lp.summary || lp.about || dm.about || '',
          registered_at: lp.registered_at || null,
          registered_at_eastern: lp.registered_at ? formatEasternDateTime(lp.registered_at) : null,
          follower_count: lp.follower_count ?? lp.followers_count ?? null,
          connections_count: lp.connections_count ?? lp.connection_count ?? null,
          is_premium: Boolean(lp.is_premium || dm.is_premium),
          is_influencer: Boolean(lp.is_influencer || dm.is_influencer),
          is_creator: Boolean(lp.is_creator || dm.is_creator),
          is_open_to_work: Boolean(lp.is_open_to_work || dm.is_open_to_work),
          is_hiring: Boolean(lp.is_hiring || dm.is_hiring),
          verified: Boolean(lp.verified || dm.verified),
          is_paid_advertiser: Boolean(lp.isAdvertisement || lp.is_advertiser || lp.is_paid_advertiser || (l.raw_data as any)?.isAdvertisement),
          skills: lp.skills || [],
          languages: lp.languages || [],
          certifications: lp.certifications || [],
          experience_history: lp.experience_history || lp.experience || [],
          education_history: lp.education_history || lp.education || [],
          honors_and_awards: lp.honors_and_awards || [],
          volunteering: lp.volunteering || [],
          projects: lp.projects || [],
          courses: lp.courses || [],
          services: lp.services || [],
          profile_image_url: lp.profile_image_url || dm.profile_image_url || null,
          cover_image_url: lp.cover_image_url || null,
        },

        // 7. Complete LinkedIn Posts Data (0% Loss)
        linkedin_posts: posts.map((p: any) => ({
          id: p.id || p.post_id || p.share_urn || '',
          content: p.content || p.text || '',
          posted_at: p.posted_at || p.postedAt || p.date || null,
          posted_at_eastern: (p.posted_at || p.postedAt || p.date) ? formatEasternDateTime(p.posted_at || p.postedAt || p.date) : null,
          posted_ago_text: p.posted_ago_text || '',
          post_type: p.post_type || p.type || 'post',
          url: p.postUrl || p.post_url || p.url || p.linkedin_url || p.share_linkedin_url || '',
          likes: p.likes ?? 0,
          comments: p.comments ?? 0,
          shares: p.shares ?? 0,
          reactions_breakdown: p.reactions_breakdown || [],
          author_name: p.author_name || dm.full_name || '',
          author_headline: p.author_headline || dm.headline || '',
          images: p.images || p.post_images || p.media_urls || [],
          article: p.article_title ? {
            title: p.article_title,
            url: p.article_url,
            image: p.article_image,
            publisher: p.article_publisher,
          } : (p.article || null),
        })),

        // 8. AI ICP Intelligence & Qualification
        ai_intelligence: {
          score: l.score ?? null,
          score_label: l.score_label ?? null,
          score_reasons: l.score_reasons || [],
          ai_reasoning: l.ai_reasoning || (l.crm_signals as any)?.ai_consolidated_data?.qualification_reasoning || '',
          pain_points: l.insight?.pain_points || (l.crm_signals as any)?.ai_consolidated_data?.insights?.pain_points || '',
          operational_gap: l.insight?.operational_gap || (l.crm_signals as any)?.ai_consolidated_data?.insights?.operational_gap || '',
          opportunity: l.insight?.opportunity || (l.crm_signals as any)?.ai_consolidated_data?.insights?.opportunity || '',
          sales_brief: l.sales_brief || '',
          why_now: l.why_now || '',
          recommended_service: l.recommended_service || '',
        },

        // 9. Outreach & Cold Pitch Drafts
        email_drafts: (l.email_drafts && l.email_drafts.length > 0) ? l.email_drafts : (
          (l.crm_signals as any)?.ai_consolidated_data?.email_draft ? [(l.crm_signals as any).ai_consolidated_data.email_draft] : []
        ),

        // 10. Sales CRM & Follow-up Actions
        sales_workflow: {
          follow_up_date: l.follow_up_date || null,
          follow_up_time: l.follow_up_time || null,
          follow_up_status: l.follow_up_status || 'none',
          follow_up_priority: l.follow_up_priority || 'medium',
          follow_up_action_type: l.follow_up_action_type || 'call',
          follow_up_notes: l.follow_up_notes || '',
          last_contacted_at: l.last_contacted_at || null,
          notes: l.notes || '',
        },

        // 11. Platform Timestamps (Standard & Eastern Formatted)
        scraped_at: l.scraped_at || null,
        scraped_at_eastern: l.scraped_at ? formatEasternDateTime(l.scraped_at) : null,
        created_at: l.created_at || null,
        created_at_eastern: l.created_at ? formatEasternDateTime(l.created_at) : null,
        updated_at: l.updated_at || null,
        updated_at_eastern: l.updated_at ? formatEasternDateTime(l.updated_at) : null,
      };

      return item;
    });

    const jsonStr = JSON.stringify(exportData, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json;charset=utf-8;' }));
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    a.download = `leads_export_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
    
    a.click();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-modal w-96 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Export Leads</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Exporting {selectedCount > 0 ? `${selectedCount} selected leads` : `${totalFilteredCount} filtered leads`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-1 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-none group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 7.5l8.625 4.5m0 0l8.625-4.5M12 12v9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 7.5L12 3l8.625 4.5M3.375 7.5v9l8.625 4.5m8.625-4.5v-9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Export as CSV</p>
              <p className="text-xs text-zinc-400 mt-0.5">Spreadsheet format for Excel</p>
            </div>
          </button>
          
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center flex-none group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Export as JSON</p>
              <p className="text-xs text-zinc-400 mt-0.5">Raw data format with all AI info</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
