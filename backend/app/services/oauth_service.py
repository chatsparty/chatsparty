import uuid
from typing import Optional
from authlib.integrations.httpx_client import AsyncOAuth2Client
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
import httpx

from ..models.database import User
from ..core.config import settings
from .auth_service import auth_service


class OAuthService:
    def __init__(self):
        self.google_client_id = settings.google_client_id
        self.google_client_secret = settings.google_client_secret
        self.github_client_id = settings.github_client_id
        self.github_client_secret = settings.github_client_secret
        self.frontend_url = settings.frontend_url

    def get_google_auth_url(self, state: str) -> str:
        """Generate Google OAuth authorization URL"""
        if not self.google_client_id:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Google OAuth not configured"
            )
        
        redirect_uri = f"{self.frontend_url}/auth/callback/google"
        
        client = AsyncOAuth2Client(
            client_id=self.google_client_id,
            redirect_uri=redirect_uri,
        )
        
        authorization_url, _ = client.create_authorization_url(
            "https://accounts.google.com/o/oauth2/auth",
            scope="openid email profile",
            state=state
        )
        
        return authorization_url

    def get_github_auth_url(self, state: str) -> str:
        """Generate GitHub OAuth authorization URL"""
        if not self.github_client_id:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="GitHub OAuth not configured"
            )
        
        redirect_uri = f"{self.frontend_url}/auth/callback/github"
        
        client = AsyncOAuth2Client(
            client_id=self.github_client_id,
            redirect_uri=redirect_uri,
        )
        
        authorization_url, _ = client.create_authorization_url(
            "https://github.com/login/oauth/authorize",
            scope="user:email",
            state=state
        )
        
        return authorization_url

    async def handle_google_callback(self, db: AsyncSession, code: str) -> User:
        """Handle Google OAuth callback and create/login user"""
        if not self.google_client_id or not self.google_client_secret:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Google OAuth not configured"
            )
        
        redirect_uri = f"{self.frontend_url}/auth/callback/google"
        
        client = AsyncOAuth2Client(
            client_id=self.google_client_id,
            client_secret=self.google_client_secret,
            redirect_uri=redirect_uri,
        )
        
        try:
            # Exchange code for token
            token = await client.fetch_token(
                "https://oauth2.googleapis.com/token",
                code=code
            )
            
            # Get user info from Google
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {token['access_token']}"}
                )
                response.raise_for_status()
                user_info = response.json()
            
            return await self._create_or_get_oauth_user(
                db, 
                email=user_info["email"],
                first_name=user_info.get("given_name"),
                last_name=user_info.get("family_name"),
                provider="google",
                provider_id=user_info["id"]
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to authenticate with Google: {str(e)}"
            )

    async def handle_github_callback(self, db: AsyncSession, code: str) -> User:
        """Handle GitHub OAuth callback and create/login user"""
        if not self.github_client_id or not self.github_client_secret:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="GitHub OAuth not configured"
            )
        
        redirect_uri = f"{self.frontend_url}/auth/callback/github"
        
        client = AsyncOAuth2Client(
            client_id=self.github_client_id,
            client_secret=self.github_client_secret,
            redirect_uri=redirect_uri,
        )
        
        try:
            # Exchange code for token
            token = await client.fetch_token(
                "https://github.com/login/oauth/access_token",
                code=code
            )
            
            # Get user info from GitHub
            async with httpx.AsyncClient() as http_client:
                # Get user profile
                user_response = await http_client.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"Bearer {token['access_token']}"}
                )
                user_response.raise_for_status()
                user_info = user_response.json()
                
                # Get user emails (GitHub might not return email in profile)
                email_response = await http_client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {token['access_token']}"}
                )
                email_response.raise_for_status()
                emails = email_response.json()
                
                # Find primary email
                primary_email = None
                for email_obj in emails:
                    if email_obj.get("primary", False):
                        primary_email = email_obj["email"]
                        break
                
                if not primary_email:
                    primary_email = user_info.get("email")
                
                if not primary_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No email found in GitHub profile"
                    )
            
            return await self._create_or_get_oauth_user(
                db,
                email=primary_email,
                first_name=user_info.get("name"),
                last_name=None,
                provider="github",
                provider_id=str(user_info["id"])
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to authenticate with GitHub: {str(e)}"
            )

    async def _create_or_get_oauth_user(
        self, 
        db: AsyncSession, 
        email: str, 
        first_name: Optional[str], 
        last_name: Optional[str],
        provider: str,
        provider_id: str
    ) -> User:
        """Create or get user from OAuth provider info"""
        # Check if user already exists
        existing_user = await auth_service.get_user_by_email(db, email)
        
        if existing_user:
            return existing_user
        
        # Create new user with OAuth info
        # Generate a random password since OAuth users don't need it
        random_password = str(uuid.uuid4())
        hashed_password = auth_service.get_password_hash(random_password)
        
        db_user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            is_verified=True,  # OAuth users are considered verified
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user


oauth_service = OAuthService()