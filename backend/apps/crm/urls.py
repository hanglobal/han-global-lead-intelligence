from django.urls import path
from . import views

urlpatterns = [
    path('leads/', views.LeadListCreateView.as_view(), name='lead-list'),
    path('leads/<int:pk>/', views.LeadDetailView.as_view(), name='lead-detail'),
    path('leads/<int:pk>/status/', views.LeadStatusUpdateView.as_view(), name='lead-status-update'),
    path('leads/<int:pk>/activities/', views.LeadActivityListView.as_view(), name='lead-activities'),
    path('leads/<int:pk>/people/', views.CompanyPersonListCreateView.as_view(), name='lead-people'),
    path('leads/<int:pk>/people/<int:person_id>/', views.CompanyPersonDetailView.as_view(), name='lead-person-detail'),
    path('stats/', views.CRMStatsView.as_view(), name='crm-stats'),
    path('leads/bulk-score/', views.BulkScoreLeadsView.as_view(), name='bulk-score-leads'),
    path('settings/qualification/', views.LeadQualificationSettingsView.as_view(), name='settings-qualification'),

    # ── Sales Action Center & Outreach Routes ───────────────────────────────
    path('sales/overview/', views.SalesOverviewView.as_view(), name='sales-overview'),
    path('sales/bucket-leads/', views.SalesBucketLeadsView.as_view(), name='sales-bucket-leads'),
    path('sales/followups/', views.SalesFollowUpsView.as_view(), name='sales-followups'),
    path('sales/leads-to-contact/', views.SalesLeadsToContactView.as_view(), name='sales-leads-to-contact'),
    path('leads/<int:pk>/schedule-followup/', views.LeadScheduleFollowUpView.as_view(), name='lead-schedule-followup'),
    path('leads/<int:pk>/complete-followup/', views.LeadCompleteFollowUpView.as_view(), name='lead-complete-followup'),
    path('leads/<int:pk>/log-outreach/', views.LeadLogOutreachView.as_view(), name='lead-log-outreach'),
    path('leads/<int:pk>/lead-notes/', views.LeadNotesView.as_view(), name='lead-notes-history'),
]
