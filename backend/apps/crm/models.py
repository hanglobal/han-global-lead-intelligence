from django.db import models


def _make_lid():
    # Kept for backward compatibility with old migrations — do not remove
    import uuid
    return 'LD-' + uuid.uuid4().hex[:8].upper()




class Lead(models.Model):
    # ── Identity ─────────────────────────────────────────────────────────────
    lid             = models.CharField(max_length=20, unique=True, blank=True, null=True, editable=False)
    place_id        = models.CharField(max_length=255, unique=True, blank=True, db_index=True)
    fid             = models.CharField(max_length=255, blank=True, default='')
    source          = models.CharField(max_length=50, blank=True, null=True)

    # ── Company Info (Exact Nexus Fields) ────────────────────────────────────
    company_name                 = models.CharField(max_length=255, blank=True)
    company_website              = models.TextField(blank=True, null=True)
    company_domain               = models.CharField(max_length=255, blank=True, null=True)
    company_phone                = models.CharField(max_length=255, blank=True, null=True)
    company_linkedin             = models.TextField(blank=True, null=True)
    industry                     = models.CharField(max_length=255, blank=True, null=True)
    company_size                 = models.CharField(max_length=100, blank=True, null=True)
    company_annual_revenue       = models.CharField(max_length=100, blank=True, null=True)
    company_annual_revenue_clean = models.CharField(max_length=100, blank=True, null=True)
    company_total_funding        = models.CharField(max_length=100, blank=True, null=True)
    company_total_funding_clean  = models.CharField(max_length=100, blank=True, null=True)
    company_technologies         = models.JSONField(default=list, blank=True)
    keywords                     = models.TextField(blank=True, null=True)
    company_description          = models.TextField(blank=True, null=True)
    city                         = models.CharField(max_length=255, blank=True, null=True)
    state                        = models.CharField(max_length=100, blank=True, null=True)
    country                      = models.CharField(max_length=100, blank=True, null=True)

    # ── Additional Address / Contact Info ─────────────────────────────────────
    company_full_address         = models.TextField(blank=True)
    company_street_address       = models.CharField(max_length=255, blank=True, null=True)
    neighborhood                 = models.CharField(max_length=255, blank=True, null=True)
    company_postal_code          = models.CharField(max_length=20, blank=True, null=True)
    latitude                     = models.FloatField(blank=True, null=True)
    longitude                    = models.FloatField(blank=True, null=True)
    company_email                = models.CharField(max_length=500, blank=True, null=True)
    google_maps_url              = models.TextField(blank=True, null=True)

    # ── Legacy / Rating ───────────────────────────────────────────────────────
    rating          = models.FloatField(blank=True, null=True)
    review_count    = models.IntegerField(blank=True, null=True)
    price_level     = models.CharField(max_length=10, blank=True, null=True)

    # ── Social ────────────────────────────────────────────────────────────────
    facebook_url    = models.TextField(blank=True, null=True)
    twitter_url     = models.TextField(blank=True, null=True)
    instagram_url   = models.TextField(blank=True, null=True)
    youtube_url     = models.TextField(blank=True, null=True)
    tiktok_url      = models.TextField(blank=True, null=True)
    pinterest_url   = models.TextField(blank=True, null=True)
    social_links    = models.JSONField(default=dict, blank=True)

    # ── CRM Pipeline ─────────────────────────────────────────────────────────
    STATUS_CHOICES = [
        ('new', 'New'),
        ('qualified', 'Qualified'),
        ('contacted', 'Contacted'),
        ('follow_up_scheduled', 'Follow-up Scheduled'),
        ('in_discussion', 'In Discussion'),
        ('meeting_booked', 'Meeting Booked'),
        ('closed_won', 'Closed Won'),
        ('closed_lost', 'Closed Lost'),
        ('unqualified', 'Unqualified'),
    ]
    status          = models.CharField(max_length=50, choices=STATUS_CHOICES, default='new')
    stage           = models.CharField(max_length=100, blank=True, null=True, help_text="Stage where the lead failed or completed")
    score           = models.FloatField(blank=True, null=True)
    score_label     = models.CharField(max_length=50, blank=True, null=True)
    classification  = models.CharField(max_length=100, blank=True, null=True)
    notes           = models.TextField(blank=True, null=True)
    tags            = models.JSONField(default=list, blank=True)
    working_hours   = models.TextField(blank=True, null=True)
    ai_reasoning    = models.TextField(blank=True, null=True, help_text="Reasoning for AI qualification/rejection")

    # ── Sales & Follow-up Workflow ──────────────────────────────────────────
    follow_up_date        = models.DateField(null=True, blank=True, db_index=True)
    follow_up_time        = models.CharField(max_length=50, blank=True, null=True)
    follow_up_status      = models.CharField(
        max_length=50, 
        default='none', 
        db_index=True,
        choices=[
            ('none', 'None'),
            ('scheduled', 'Scheduled'),
            ('overdue', 'Overdue'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ]
    )
    follow_up_priority    = models.CharField(
        max_length=20, 
        default='medium',
        choices=[
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low'),
        ]
    )
    follow_up_action_type = models.CharField(
        max_length=50, 
        default='call',
        choices=[
            ('call', 'Call'),
            ('email', 'Email'),
            ('linkedin', 'LinkedIn Message'),
            ('meeting', 'Meeting / Demo'),
            ('other', 'Other'),
        ]
    )
    follow_up_notes       = models.TextField(blank=True, null=True)
    last_contacted_at     = models.DateTimeField(null=True, blank=True, db_index=True)

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
        if not self.place_id:
            import uuid
            self.place_id = f"manual_{uuid.uuid4().hex[:16]}"
        if self.fid is None:
            self.fid = ''
        if not self.company_name:
            self.company_name = 'Unnamed Lead'
        if self.company_full_address is None:
            self.company_full_address = ''
        super().save(*args, **kwargs)
        # Generate LID after save so we can use the DB-assigned pk (guaranteed unique).
        # Using COUNT() was not atomic under concurrent Celery workers.
        if is_new and not self.lid:
            self.lid = f"LID-{self.pk}"
            Lead.objects.filter(pk=self.pk).update(lid=self.lid)

    # ── Backwards-Compatible Aliases with Setters ─────────────────────────────
    @property
    def name(self):
        return self.company_name

    @name.setter
    def name(self, value):
        self.company_name = value or ''

    @property
    def website(self):
        return self.company_website

    @website.setter
    def website(self, value):
        self.company_website = value or ''

    @property
    def category(self):
        return self.industry

    @category.setter
    def category(self, value):
        self.industry = value or ''

    @property
    def address(self):
        return self.company_full_address

    @address.setter
    def address(self, value):
        self.company_full_address = value or ''

    @property
    def street_address(self):
        return self.company_street_address

    @street_address.setter
    def street_address(self, value):
        self.company_street_address = value or ''

    @property
    def postal_code(self):
        return self.company_postal_code

    @postal_code.setter
    def postal_code(self, value):
        self.company_postal_code = value or ''

    @property
    def linkedin_url(self):
        return self.company_linkedin

    @linkedin_url.setter
    def linkedin_url(self, value):
        self.company_linkedin = value or ''

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
        return f"{self.lid} — {self.company_name or 'Unnamed'}"

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
    performed_by  = models.CharField(max_length=100, default='User', blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'crm_lead_activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.activity_type} on {self.lead.lid}"


class LeadNote(models.Model):
    lead       = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='lead_notes')
    note       = models.TextField()
    created_by = models.CharField(max_length=100, default='User', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'crm_lead_notes'
        ordering = ['-created_at']

    def __str__(self):
        return f"Note on {self.lead.lid} at {self.created_at}"


class CompanyPerson(models.Model):
    # ── Decision Maker Info (Exact Nexus Fields) ──────────────────────────────
    lead                = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='company_people')
    full_name           = models.CharField(max_length=255)
    first_name          = models.CharField(max_length=100, blank=True, null=True)
    last_name           = models.CharField(max_length=100, blank=True, null=True)
    job_title           = models.CharField(max_length=255, blank=True, default='')
    headline            = models.TextField(blank=True, null=True)
    seniority_level     = models.CharField(max_length=100, blank=True, null=True)
    functional_level    = models.CharField(max_length=100, blank=True, null=True)
    email               = models.EmailField(blank=True, null=True)
    personal_email      = models.EmailField(blank=True, null=True)
    mobile_number       = models.CharField(max_length=50, blank=True, null=True)
    linkedin            = models.URLField(max_length=500, blank=True, null=True)
    city                = models.CharField(max_length=100, blank=True, null=True)
    state               = models.CharField(max_length=100, blank=True, null=True)
    country             = models.CharField(max_length=100, blank=True, null=True)

    # ── Enriched Profile Data (Nexus LINKEDIN Campaign) ───────────────────────
    profile_image_url   = models.URLField(max_length=1000, blank=True, null=True)
    skills              = models.JSONField(default=list, blank=True)
    experience_history  = models.JSONField(default=list, blank=True)
    education_history   = models.JSONField(default=list, blank=True)
    about               = models.TextField(blank=True, null=True)

    # ── Backwards-Compatible Aliases ──────────────────────────────────────────
    @property
    def companyperson_name(self):
        return self.full_name

    @property
    def role(self):
        return self.job_title

    @property
    def linkedin_url(self):
        return self.linkedin

    # ── Meta ──────────────────────────────────────────────────────────────────
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'crm_company_people'
        ordering = ['lead_id', 'full_name']
        constraints = [
            models.UniqueConstraint(
                fields=('lead', 'full_name', 'job_title'),
                name='uniq_person_per_lead_role',
            )
        ]

    def __str__(self):
        return f"{self.full_name} ({self.job_title}) @ {self.lead.lid}"


class LeadQualificationSettings(models.Model):
    min_reviews = models.IntegerField(default=0)
    min_rating = models.FloatField(default=0.0)
    require_website = models.BooleanField(default=True)
    require_name = models.BooleanField(default=True)
    require_direct_contact = models.BooleanField(default=True, help_text="Require direct email, personal email, or mobile number")
    require_linkedin = models.BooleanField(default=False, help_text="Require personal LinkedIn URL")
    require_phone = models.BooleanField(default=False)
    agency_services = models.TextField(
        blank=True, 
        default='', 
        help_text="Describe your agency's services. Used by AI to evaluate if a lead is a good fit."
    )
    scoring_rules = models.TextField(
        blank=True,
        default="Score the lead out of 100 based on the following rules:\n- If the lead has a direct email or personal email, add 25 points.\n- If the lead has a mobile phone or direct number, add 20 points.\n- If the lead has a website, add 15 points.\n- If the lead has a LinkedIn profile URL, add 15 points.\n- If the lead has company size, tech stack, or revenue data, add 10 points.\n- If the lead has an address or location, add 10 points.\n- If the lead has a category or industry, add 5 points.",
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
