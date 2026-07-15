from django.urls import path
from . import views

urlpatterns = [
    path('leads/', views.LeadListCreateView.as_view(), name='lead-list'),
    path('leads/<int:pk>/', views.LeadDetailView.as_view(), name='lead-detail'),
    path('leads/<int:pk>/scrape/', views.LeadScrapeView.as_view(), name='lead-scrape'),
    path('leads/<int:pk>/status/', views.LeadStatusUpdateView.as_view(), name='lead-status-update'),
    path('leads/<int:pk>/notes/', views.LeadNotesUpdateView.as_view(), name='lead-notes-update'),
    path('leads/<int:pk>/activities/', views.LeadActivityListView.as_view(), name='lead-activities'),
    path('leads/<int:pk>/people/', views.CompanyPersonListCreateView.as_view(), name='lead-people'),
    path('leads/<int:pk>/people/<int:person_id>/', views.CompanyPersonDetailView.as_view(), name='lead-person-detail'),
    path('leads/<int:pk>/people/<int:person_id>/primary/', views.SetPrimaryPersonView.as_view(), name='lead-person-primary'),
    path('stats/', views.CRMStatsView.as_view(), name='crm-stats'),
    path('leads/bulk-import/', views.BulkImportLeadsView.as_view(), name='bulk-import-leads'),
    path('leads/bulk-score/', views.BulkScoreLeadsView.as_view(), name='bulk-score-leads'),
    path('settings/qualification/', views.LeadQualificationSettingsView.as_view(), name='settings-qualification'),
]
