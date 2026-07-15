import base64
from django.http import HttpResponse

class BasicAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.username = 'admin'
        self.password = '321@admin'

    def __call__(self, request):
        # Allow preflight requests to pass through
        if request.method == 'OPTIONS':
            return self.get_response(request)

        # Exclude webhook paths from basic auth
        if request.path.startswith('/api/lead-hunter/webhook/'):
            return self.get_response(request)
            
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Basic '):
            try:
                encoded_credentials = auth_header.split(' ')[1]
                decoded_credentials = base64.b64decode(encoded_credentials).decode('utf-8')
                username, password = decoded_credentials.split(':', 1)
                
                if username == self.username and password == self.password:
                    return self.get_response(request)
            except Exception:
                pass
                
        response = HttpResponse("Unauthorized", status=401)
        response['WWW-Authenticate'] = 'Basic realm="Secure Area"'
        return response
