import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from ..core.database import get_db_session
from ..core.config import settings
from ..models.auth import (
    UserCreate, UserLogin, UserResponse, Token, RefreshTokenRequest,
    OAuthInitRequest, OAuthInitResponse, OAuthCallbackRequest, AuthConfigResponse
)
from ..services.auth_service import auth_service
from ..services.oauth_service import oauth_service

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config():
    """Get authentication configuration"""
    try:
        logger.info("Getting auth config...")
        config = AuthConfigResponse(
            social_auth_only=settings.social_auth_only,
            google_enabled=bool(settings.google_client_id and settings.google_client_secret),
            github_enabled=bool(settings.github_client_id and settings.github_client_secret)
        )
        logger.info("Auth config retrieved successfully")
        return config
    except Exception as e:
        logger.error(f"Failed to get auth config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get authentication configuration")


@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """Register a new user"""
    if settings.social_auth_only:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Traditional registration is disabled. Please use social authentication."
        )
    return await auth_service.create_user(db, user_data)


@router.post("/login", response_model=Token)
async def login_user(
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db_session)
):
    """Authenticate user and return JWT tokens"""
    if settings.social_auth_only:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Traditional login is disabled. Please use social authentication."
        )
    
    user = await auth_service.authenticate_user(
        db, user_credentials.email, user_credentials.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    access_token = auth_service.create_access_token(data={"sub": user.id})
    refresh_token = auth_service.create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Refresh access token using refresh token"""
    token_data = auth_service.verify_token(refresh_request.refresh_token, "refresh")
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(db, token_data.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    access_token = auth_service.create_access_token(data={"sub": user.id})
    new_refresh_token = auth_service.create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session)
):
    """Get current user information"""
    token_data = auth_service.verify_token(credentials.credentials)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(db, token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session)
):
    """Dependency to get current authenticated user"""
    token_data = auth_service.verify_token(credentials.credentials)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await auth_service.get_user_by_id(db, token_data.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user


@router.post("/oauth/init", response_model=OAuthInitResponse)
async def init_oauth(request: OAuthInitRequest):
    """Initialize OAuth flow and return authorization URL"""
    state = str(uuid.uuid4())
    
    if request.provider == "google":
        auth_url = oauth_service.get_google_auth_url(state)
    elif request.provider == "github":
        auth_url = oauth_service.get_github_auth_url(state)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported OAuth provider"
        )
    
    return OAuthInitResponse(auth_url=auth_url, state=state)


@router.post("/oauth/callback/{provider}", response_model=Token)
async def oauth_callback(
    provider: str,
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Handle OAuth callback and return JWT tokens"""
    if provider == "google":
        user = await oauth_service.handle_google_callback(db, request.code)
    elif provider == "github":
        user = await oauth_service.handle_github_callback(db, request.code)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported OAuth provider"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    access_token = auth_service.create_access_token(data={"sub": user.id})
    refresh_token = auth_service.create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }