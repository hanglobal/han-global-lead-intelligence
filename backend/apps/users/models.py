from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    profile_dp = models.TextField(blank=True, null=True, help_text="Base64 encoded image string")

    def __str__(self):
        return f"{self.user.username}'s Profile"
