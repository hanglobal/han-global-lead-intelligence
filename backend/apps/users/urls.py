from django.urls import path
from . import views

urlpatterns = [
    path('verify-auth/', views.verify_auth, name='verify_auth'),
    path('profile/', views.profile_view, name='profile_view'),
    path('update-security/', views.update_security, name='update_security'),
]
