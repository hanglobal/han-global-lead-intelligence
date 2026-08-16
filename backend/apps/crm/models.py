from django.db import models


def _make_lid():
    # Kept for backward compatibility with old migrations — do not remove
    import uuid
    return 'LD-' + uuid.uuid4().hex[:8].upper()




class Lead(models.Model):
    # ── Identity ─────────────────────────────────────────────────────────────
    lid             = models.CharField(max_length=20, unique=True, blank=True, null=True, editable=False)
    place_id        = models.CharField(max_length=255, unique=True, blank=True, db_index=True)
    fid             = models.CharField(max_length=255, blank=True)
    source          = models.CharField(max_length=50, blank=True, null=True)

    # ── Company Info ──────────────────────────────────────────────────────────
    name            = models.CharField(max_length=255, blank=True)
    category        = models.CharField(max_length=255, blank=True, null=True)
    rating          = models.FloatField(blank=True, null=True)
    review_count    = models.IntegerField(blank=True, null=True)
    price_level     = models.CharField(max_length=10, blank=True, null=True)

    # ── Location ──────────────────────────────────────────────────────────────
    address         = models.TextField(blank=True)
    street_address  = models.CharField(max_length=255, blank=True, null=True)
    neighborhood    = models.CharField(max_length=255, blank=True, null=True)
    city            = models.CharField(max_length=255, blank=True, null=True)
    postal_code     = models.CharField(max_length=20, blank=True, null=True)
    latitude        = models.FloatField(blank=True, null=True)
    longitude       = models.FloatField(blank=True, null=True)

    # ── Contact ───────────────────────────────────────────────────────────────
    company_phone   = models.CharField(max_length=255, blank=True, null=True)
    company_email   = models.CharField(max_length=500, blank=True, null=True)
    website         = models.TextField(blank=True, null=True)
    google_maps_url = models.TextField(blank=True, null=True)

    # ── Social ────────────────────────────────────────────────────────────────
    facebook_url    = models.TextField(blank=True, null=True)
    twitter_url     = models.TextField(blank=True, null=True)
    instagram_url   = models.TextField(blank=True, null=True)
    linkedin_url    = models.TextField(blank=True, null=True)
    youtube_url     = models.TextField(blank=True, null=True)
    tiktok_url      = models.TextField(blank=True, null=True)
    pinterest_url   = models.TextField(blank=True, null=True)
    social_links    = models.JSONField(default=dict, blank=True)

    # ── CRM Pipeline ─────────────────────────────────────────────────────────
    STATUS_CHOICES = [
        ('new', 'New'), ('qualified', 'Qualified'), ('unqualified', 'Unqualified'),
    ]
    status          = models.CharField(max_length=50, choices=STATUS_CHOICES, default='new')
    stage           = models.CharField(max_length=100, blank=True, null=True, help_text="Stage where the lead failed or completed")
    score           = models.FloatField(blank=True, null=True)
    score_label     = models.CharField(max_length=50, blank=True, null=True)
    classification  = models.CharField(max_length=100, blank=True, null=True)
    notes           = models.TextField(blank=True, null=True)
    tags            = models.JSONField(default=list, blank=True)
    crm_signals     = models.JSONField(default=dict, blank=True)
    working_hours   = models.TextField(blank=True, null=True)
    ai_reasoning    = models.TextField(blank=True, null=True, help_text="Reasoning for AI qualification/rejection")

    # ── Campaign Link ─────────────────────────────────────────────────────────
    campaign_id        = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    source_campaign_id = models.IntegerField(blank=True, null=True)
    campaign_ref = models.ForeignKey(
        'lead_hunter.Campaign',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='leads',
    )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new and not self.lid:
            # strictly sequential based on current count
            count = Lead.objects.count()
            self.lid = f"LID-{count + 1}"
        super().save(*args, **kwargs)

    # ── Raw / Meta ────────────────────────────────────────────────────────────
    crm_signals = models.JSONField(default=dict, blank=True, null=True)
    raw_data = models.JSONField(default=dict, blank=True, null=True)
    
    is_llm_processed = models.BooleanField(default=False, help_text="True when LLM consolidation is complete")

    # Meta
    scraped_at  = models.DateTimeField(blank=True, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'crm_leads'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.lid} — {self.name or 'Unnamed'}"

    @staticmethod
    def calculate_score_label(score):
        if score is None:  return None
        if score >= 70:    return 'hot'
        if score >= 40:    return 'warm'
        return 'cold'


class LeadActivity(models.Model):
    lead          = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=100, blank=True)
    description   = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'crm_lead_activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.activity_type} on {self.lead.lid}"


class CompanyPerson(models.Model):
    # ── Person Info ───────────────────────────────────────────────────────────
    lead                = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='company_people')
    companyperson_name  = models.CharField(max_length=255)
    role                = models.CharField(max_length=100, blank=True, default='')
    email               = models.EmailField(blank=True, null=True)
    phone               = models.CharField(max_length=50, blank=True, null=True)
    website             = models.URLField(max_length=500, blank=True, null=True)
    linkedin_url        = models.URLField(max_length=500, blank=True, null=True)
    is_primary          = models.BooleanField(default=False)

    # ── Meta ──────────────────────────────────────────────────────────────────
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'crm_company_people'
        ordering = ['lead_id', '-is_primary', 'companyperson_name']
        constraints = [
            models.UniqueConstraint(
                fields=('lead', 'companyperson_name', 'role'),
                name='uniq_person_per_lead_role',
            )
        ]
        indexes = [
            models.Index(fields=['lead', 'is_primary'], name='crm_company_lead_id_1c6d12_idx'),
        ]

    def __str__(self):
        return f"{self.companyperson_name} ({self.role}) @ {self.lead.lid}"


class LeadQualificationSettings(models.Model):
    min_reviews = models.IntegerField(default=10)
    min_rating = models.FloatField(default=4.0)
    require_website = models.BooleanField(default=True)
    require_phone = models.BooleanField(default=True)
    require_name = models.BooleanField(default=True)
    agency_services = models.TextField(
        blank=True, 
        default='', 
        help_text="Describe your agency's services. Used by AI to evaluate if a lead is a good fit."
    )
    scoring_rules = models.TextField(
        blank=True,
        default="Score the lead out of 100 based on the following rules:\n- If the lead has a company email, add 20 points.\n- If the lead has a company phone, add 15 points.\n- If the lead has a website, add 15 points.\n- If the lead has a rating, add (rating * 2) points, up to a maximum of 15 points.\n- If the lead has more than 10 reviews, add 10 points.\n- If the lead has a Facebook, Instagram, or LinkedIn URL, add 10 points.\n- If the lead has an address, add 5 points.\n- If the lead has a category, add 5 points.\n- If the lead has a Google Maps URL, add 5 points.",
        help_text="Dynamic AI lead scoring rules."
    )
    insight_generation_rules = models.TextField(
        blank=True,
        default="Analyze the lead data and generate three strategic insights. Your response should be detailed, providing 10 to 15 lines of rich analysis for the lead:\n1. Pain Points: What are the likely operational or business challenges this specific lead faces?\n2. Operational Gap: What are they missing that our solution provides?\n3. Opportunity: How can we position our product to close this deal?",
        help_text="Dynamic AI rules for generating insights."
    )
    email_generation_rules = models.TextField(
        blank=True,
        default="Write a highly personalized, cold outreach email for the prospect below.\nUse the provided AI-generated insights to make the email relevant to their specific business.\nThe email should be concise (under 150 words), conversational, and end with a low-friction call to action.",
        help_text="Dynamic AI rules for generating email drafts."
    )

    class Meta:
        db_table = 'crm_lead_qualification_settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Lead Qualification Settings"

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Lead)
def create_lead_imported_activity(sender, instance, created, **kwargs):
    if created:
        LeadActivity.objects.get_or_create(
            lead=instance,
            activity_type='lead_imported',
            defaults={'description': 'Lead was added to the system.'}
        )
