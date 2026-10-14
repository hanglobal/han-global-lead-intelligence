from django.db import models


class LeadEmailDraft(models.Model):
    lead       = models.ForeignKey('crm.Lead', on_delete=models.CASCADE, related_name='email_drafts')
    subject    = models.CharField(max_length=500)
    body       = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enrichment_lead_email_draft'
        ordering = ['-created_at']

    def __str__(self):
        return f"Draft: {self.subject[:60]} ({self.lead.lid})"


class LeadEnrichment(models.Model):
    lead = models.ForeignKey('crm.Lead', on_delete=models.CASCADE, related_name='enrichments', null=True, blank=True)
    scraper_run_id = models.CharField(max_length=255, null=True, blank=True)
    web_scrape_raw = models.JSONField(default=list, help_text="Raw Firecrawl scrape data")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enrichment_lead_enrichment'
        ordering = ['-created_at']

    def __str__(self):
        return f"Enrichment {self.id} (Lead: {self.lead_id})"


class LeadInsight(models.Model):
    lead = models.OneToOneField('crm.Lead', on_delete=models.CASCADE, related_name='insight')
    pain_points = models.TextField(blank=True, null=True)
    operational_gap = models.TextField(blank=True, null=True)
    opportunity = models.TextField(blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'enrichment_lead_insight'

    def __str__(self):
        return f"Insight for Lead: {self.lead_id}"


class LinkedInProfileCache(models.Model):
    normalized_url      = models.CharField(max_length=500, unique=True, db_index=True)
    original_url        = models.TextField(blank=True)
    person_name         = models.CharField(max_length=255, blank=True, default='')
    profile_data        = models.JSONField(default=dict, blank=True)
    posts_data          = models.JSONField(default=list, blank=True)
    status              = models.CharField(
        max_length=50, 
        default='completed',
        choices=[
            ('completed', 'Completed'),
            ('in_progress', 'In Progress'),
            ('failed', 'Failed'),
        ]
    )
    profile_campaign_id = models.CharField(max_length=100, blank=True, null=True)
    post_campaign_id    = models.CharField(max_length=100, blank=True, null=True)
    hit_count           = models.IntegerField(default=1, help_text="Number of times this cached data was reused")
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enrichment_linkedin_cache'
        ordering = ['-updated_at']

    def __str__(self):
        return f"LinkedInCache: {self.normalized_url} ({self.status}) - reused {self.hit_count}x"

