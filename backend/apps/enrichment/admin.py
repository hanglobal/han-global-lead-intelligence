from django.contrib import admin
from .models import LeadEmailDraft, LeadEnrichment, LeadInsight, LinkedInProfileCache


@admin.register(LinkedInProfileCache)
class LinkedInProfileCacheAdmin(admin.ModelAdmin):
    list_display = ('normalized_url', 'person_name', 'status', 'hit_count', 'updated_at')
    search_fields = ('normalized_url', 'original_url', 'person_name')
    list_filter = ('status',)
    readonly_fields = ('created_at', 'updated_at', 'hit_count')


admin.site.register(LeadEmailDraft)
admin.site.register(LeadEnrichment)
admin.site.register(LeadInsight)


