import base64
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from apps.users.models import UserProfile

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_auth(request):
    """
    Called by Next.js middleware using HTTP Basic Auth header.
    Returns 200 OK if credentials are valid, 401 otherwise.
    """
    if not request.user.is_authenticated:
        return Response({'success': False, 'message': 'Invalid credentials'}, status=401)
    
    return Response({
        'success': True,
        'user': {
            'username': request.user.username,
            'is_superuser': request.user.is_superuser
        }
    })

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """
    Profile management for the solo administrator.
    """
    admin_user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=admin_user)

    if request.method == 'GET':
        return Response({
            'username': admin_user.username,
            'first_name': admin_user.first_name,
            'email': admin_user.email,
            'phone_number': profile.phone_number or '',
            'profile_dp': profile.profile_dp or '',
            'is_admin': True,
        })

    elif request.method == 'PUT':
        data = request.data
        admin_user.first_name = data.get('first_name', admin_user.first_name)
        admin_user.email = data.get('email', admin_user.email)
        admin_user.save()
        
        if 'phone_number' in data:
            profile.phone_number = data['phone_number']
        if 'profile_dp' in data:
            profile_dp = data['profile_dp']
            if profile_dp:
                if len(profile_dp) > 3_000_000:
                    return Response({'error': 'Profile picture too large (max 2MB)'}, status=400)
                if not (profile_dp.startswith('data:image/') or profile_dp.startswith('http://') or profile_dp.startswith('https://')):
                    return Response({'error': 'Invalid image format'}, status=400)
            profile.profile_dp = profile_dp
            
        profile.save()
        return Response({'success': True, 'message': 'Admin profile updated successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_security(request):
    """
    Update credentials for the solo administrator.
    """
    data = request.data
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    new_username = data.get('new_username')
    
    if not current_password:
        return Response({'error': 'Please provide current_password'}, status=400)
    
    # Authenticate the provided current password against the logged in admin user
    user = authenticate(username=request.user.username, password=current_password)
    
    if user is None:
        return Response({'error': 'Incorrect current password'}, status=400)
        
    admin_user = request.user
        
    if new_password:
        admin_user.set_password(new_password)
        
    if new_username:
        if User.objects.filter(username=new_username).exclude(pk=admin_user.pk).exists():
            return Response({'error': 'Username already taken'}, status=400)
        admin_user.username = new_username
        
    admin_user.save()
    
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(admin_user)
    
    return Response({
        'success': True, 
        'message': 'Admin security settings updated successfully',
        'token_update_required': bool(new_password or new_username),
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'new_username': new_username if new_username else admin_user.username,
    })
