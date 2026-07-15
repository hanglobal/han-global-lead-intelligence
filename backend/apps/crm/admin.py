from django.contrib import admin
from .models import Lead, LeadActivity, CompanyPerson

admin.site.register(Lead)
admin.site.register(LeadActivity)
admin.site.register(CompanyPerson)
