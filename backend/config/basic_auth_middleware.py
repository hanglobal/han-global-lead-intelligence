import os
import base64
import logging
from django.conf import settings
from django.http import HttpResponse

logger = logging.getLogger(__name__)


class BasicAuthMiddleware:
    """
    Defense-in-depth Basic Authentication middleware.
    Works alongside DRF's own authentication for API views.
    Protects non-DRF views (SSE, custom Django views) that DRF auth doesn't cover.
    """

    # Paths that bypass auth entirely (static assets, admin login, token refresh, OPTIONS preflight)
    EXEMPT_PREFIXES = (
        '/admin/',
        '/static/',
        '/favicon.ico',
        '/api/token/',
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.username = getattr(settings, 'BASIC_AUTH_USERNAME', None) or os.environ.get('BASIC_AUTH_USERNAME', 'admin')
        self.password = getattr(settings, 'BASIC_AUTH_PASSWORD', None) or os.environ.get('BASIC_AUTH_PASSWORD', '')

        if not self.password:
            logger.critical(
                "BasicAuthMiddleware: BASIC_AUTH_PASSWORD is NOT set. "
                "ALL authenticated requests will be REJECTED until a password is configured."
            )

    def __call__(self, request):
        # Allow CORS preflight requests
        if request.method == 'OPTIONS':
            return self.get_response(request)

        # Allow exempt paths (admin has its own session auth, static files are public)
        if any(request.path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return self.get_response(request)

        # If Django session auth already authenticated the user (e.g. admin session), allow through
        if hasattr(request, 'user') and request.user.is_authenticated:
            return self.get_response(request)

        # Allow Bearer tokens through so DRF can authenticate them via JWT
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return self.get_response(request)

        # SECURITY: If password is not configured, reject ALL requests
        if not self.password:
            logger.error(f"BasicAuthMiddleware: Rejecting {request.path} — no BASIC_AUTH_PASSWORD configured")
            return HttpResponse("Server misconfigured: authentication not available", status=503)

        # Check Basic Auth header
        if auth_header and auth_header.startswith('Basic '):
            try:
                encoded_credentials = auth_header.split(' ', 1)[1]
                decoded_credentials = base64.b64decode(encoded_credentials).decode('utf-8')
                username, password = decoded_credentials.split(':', 1)

                if username == self.username and password == self.password:
                    return self.get_response(request)
            except Exception as e:
                logger.warning(f"BasicAuthMiddleware: Failed to decode credentials: {e}")

        response = HttpResponse("Unauthorized", status=401)
        response['WWW-Authenticate'] = 'Basic realm="Secure Area"'
        return response
