from django.urls import path
from . import views

urlpatterns = [
    path('campaigns/', views.CampaignListCreateView.as_view(), name='campaign-list'),
    path('campaigns/<int:pk>/', views.CampaignDetailView.as_view(), name='campaign-detail'),
    path('campaigns/<int:pk>/run/', views.RunCampaignView.as_view(), name='campaign-run'),
    path('campaigns/<int:pk>/check-status/', views.CheckCampaignStatusView.as_view(), name='campaign-check-status'),
    path('campaigns/<int:pk>/logs/', views.CampaignLogsView.as_view(), name='campaign-logs'),
    path('campaigns/<int:pk>/results/', views.CampaignResultsView.as_view(), name='campaign-results'),
    path('stats/', views.CampaignStatsView.as_view(), name='campaign-stats'),
    path('webhook/apify/', views.ApifyWebhookView.as_view(), name='apify-webhook'),
    path('stream/', views.RealtimeStreamView.as_view(), name='realtime-stream'),
]
