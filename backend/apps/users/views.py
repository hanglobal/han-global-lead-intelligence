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
    # Always operate on the normal user, even if superuser is logged in.
    # We find the regular user (non-superuser). Since there's only 1 regular user, we pick the first one.
    target_user = User.objects.filter(is_superuser=False).first()
    if not target_user:
        return Response({'error': 'Normal user not found'}, status=404)
        
    profile, _ = UserProfile.objects.get_or_create(user=target_user)

    if request.method == 'GET':
        return Response({
            'username': target_user.username,
            'first_name': target_user.first_name,
            'email': target_user.email,
            'phone_number': profile.phone_number,
            'profile_dp': profile.profile_dp,
            'logged_in_as_superuser': request.user.is_superuser
        })

    elif request.method == 'PUT':
        data = request.data
        target_user.first_name = data.get('first_name', target_user.first_name)
        target_user.email = data.get('email', target_user.email)
        target_user.save()
        
        if 'phone_number' in data:
            profile.phone_number = data['phone_number']
        if 'profile_dp' in data:
            profile.profile_dp = data['profile_dp']
            
        profile.save()
        return Response({'success': True, 'message': 'Profile updated successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_security(request):
    data = request.data
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    new_username = data.get('new_username')
    
    if not current_password:
        return Response({'error': 'Please provide current_password'}, status=400)
    
    # Authenticate the provided current password against the LOGGED IN user
    user = authenticate(username=request.user.username, password=current_password)
    
    if user is None:
        return Response({'error': 'Incorrect current password'}, status=400)
        
    # The password was verified. Now we change the NORMAL user's details.
    target_user = User.objects.filter(is_superuser=False).first()
    if not target_user:
        return Response({'error': 'Normal user not found'}, status=404)
        
    if new_password:
        target_user.set_password(new_password)
        
    if new_username:
        if User.objects.filter(username=new_username).exclude(pk=target_user.pk).exists():
            return Response({'error': 'Username already taken'}, status=400)
        target_user.username = new_username
        
    target_user.save()
    
    # If the user who is logged in is the target_user, we need to tell the frontend to update the cookie
    # with the new credentials so they don't get logged out!
    token_update_required = False
    new_token = None
    if not request.user.is_superuser:
        token_update_required = True
        # If new_password is not provided, use current_password for the token
        final_password = new_password if new_password else current_password
        final_username = new_username if new_username else target_user.username
        
        credentials = f"{final_username}:{final_password}"
        new_token = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
    
    return Response({
        'success': True, 
        'message': 'Security settings updated successfully',
        'token_update_required': token_update_required,
        'new_token': new_token
    })
