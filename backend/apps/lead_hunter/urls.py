from django.urls import path
from . import views

urlpatterns = [
    path('campaigns/', views.CampaignListCreateView.as_view(), name='campaign-list'),
    path('campaigns/<int:pk>/', views.CampaignDetailView.as_view(), name='campaign-detail'),
    path('campaigns/<int:pk>/run/', views.RunCampaignView.as_view(), name='campaign-run'),
    path('campaigns/<int:pk>/logs/', views.CampaignLogsView.as_view(), name='campaign-logs'),
    path('campaigns/<int:pk>/results/', views.CampaignResultsView.as_view(), name='campaign-results'),
    path('stats/', views.CampaignStatsView.as_view(), name='campaign-stats'),
    path('stream/', views.RealtimeStreamView.as_view(), name='realtime-stream'),
    path('nexus/balance/', views.NexusBalanceView.as_view(), name='nexus-balance'),
    path('nexus/filters/', views.NexusFiltersView.as_view(), name='nexus-filters'),
    path('nexus/campaigns/', views.NexusCampaignListView.as_view(), name='nexus-campaigns-list'),
    path('nexus/campaigns/<str:campaign_id>/retry/', views.NexusCampaignRetryView.as_view(), name='nexus-campaign-retry'),
    path('nexus/analytics/', views.NexusFinancialAnalyticsView.as_view(), name='nexus-analytics'),
]
