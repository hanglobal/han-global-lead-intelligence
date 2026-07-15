from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/lead-hunter/', include('apps.lead_hunter.urls')),
    path('api/crm/', include('apps.crm.urls')),
]
