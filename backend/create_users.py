import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.users.models import UserProfile

# Super User
su, created = User.objects.get_or_create(username='admin')
su.set_password('321@admin')
su.is_superuser = True
su.is_staff = True
su.save()

# Normal User
nu, created = User.objects.get_or_create(username='user')
if created:
    nu.set_password('user123')
    nu.first_name = 'User'
    nu.last_name = ''
    nu.save()

# Ensure profiles exist
for u in User.objects.all():
    UserProfile.objects.get_or_create(user=u)

print("Users created successfully.")
