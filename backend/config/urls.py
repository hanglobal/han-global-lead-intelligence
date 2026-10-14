from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/lead-hunter/', include('apps.lead_hunter.urls')),
    path('api/crm/', include('apps.crm.urls')),
    path('api/users/', include('apps.users.urls')),
]
