from django.db import models


def _make_campaign_id():
    # Kept for backward compatibility with old migrations — do not remove
    import uuid
    return 'CMP-' + uuid.uuid4().hex[:8].upper()




class Campaign(models.Model):
    # ── Campaign Setup ────────────────────────────────────────────────────────
    campaign_id  = models.CharField(max_length=100, unique=True, blank=True, null=True, editable=False)
    name         = models.CharField(max_length=255, blank=True)
    description  = models.TextField(blank=True)
    niche        = models.CharField(max_length=255, blank=True)
    location     = models.CharField(max_length=255, blank=True)
    lead_count   = models.IntegerField(blank=True, null=True)
    actor_type   = models.CharField(max_length=50, default='gmap')

    # ── Apify / Status ────────────────────────────────────────────────────────
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('running', 'Running'),
        ('completed', 'Completed'), ('failed', 'Failed'),
    ]
    STAGE_CHOICES = [
        ('google_map_scraping', 'Google Map Scraping'),
        ('basic_qualification', 'Basic Qualification'),
        ('website_scraping', 'Website Scraping'),
        ('llm_processing', 'LLM Processing'),
        ('apollo_enrichment', 'Apollo Enrichment'),
        ('linkedin_scraping', 'LinkedIn Scraping'),
        ('ai_insights', 'AI Insights Generation'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    status             = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    stage              = models.CharField(max_length=50, choices=STAGE_CHOICES, default='google_map_scraping')
    apify_task_id      = models.CharField(max_length=255, blank=True, null=True)
    total_leads_found  = models.IntegerField(default=0)

    # ── Meta ──────────────────────────────────────────────────────────────────
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.upper()
        is_new = self.pk is None
        if is_new and not self.campaign_id:
            count = Campaign.objects.count()
            self.campaign_id = f"CID-{count + 1}"
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'lead_hunter_campaigns'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.campaign_id} — {self.name or 'Unnamed'}"


class CampaignResult(models.Model):
    # ── Scraped Data ──────────────────────────────────────────────────────────
    campaign     = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='results')
    place_id     = models.CharField(max_length=255, blank=True)
    name         = models.CharField(max_length=255, blank=True)
    address      = models.TextField(blank=True)
    company_phone = models.CharField(max_length=50, blank=True)
    website      = models.URLField(max_length=500, blank=True)
    rating       = models.FloatField(blank=True, null=True)
    review_count = models.IntegerField(blank=True, null=True)
    category     = models.CharField(max_length=255, blank=True)
    latitude     = models.FloatField(blank=True, null=True)
    longitude    = models.FloatField(blank=True, null=True)

    # ── Sync / Meta ───────────────────────────────────────────────────────────
    QUALIFICATION_CHOICES = [
        ('pending', 'Pending'),
        ('qualified', 'Qualified'),
        ('unqualified', 'Unqualified'),
    ]
    qualification_status = models.CharField(max_length=20, choices=QUALIFICATION_CHOICES, default='pending')
    is_duplicate        = models.BooleanField(null=True, blank=True, default=None)
    is_basic_qualified  = models.BooleanField(null=True, blank=True, default=None)
    is_website_scraped  = models.BooleanField(null=True, blank=True, default=None)
    is_llm_processed    = models.BooleanField(null=True, blank=True, default=None)
    is_apollo_processed = models.BooleanField(null=True, blank=True, default=None)
    is_linkedin_processed = models.BooleanField(null=True, blank=True, default=None)
    is_insights_processed = models.BooleanField(null=True, blank=True, default=None)
    is_crm_synced       = models.BooleanField(null=True, blank=True, default=None)
    
    raw_data            = models.JSONField(default=dict, blank=True)
    firecrawl_raw_data  = models.JSONField(default=dict, blank=True, null=True)
    ai_clean_data       = models.JSONField(default=dict, blank=True, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lead_hunter_results'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name or self.place_id} ({self.campaign.campaign_id})"


class CampaignLog(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='logs')
    message = models.TextField()
    level = models.CharField(max_length=20, default='info')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lead_hunter_campaign_logs'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.level}] {self.campaign.campaign_id} - {self.message[:50]}"
