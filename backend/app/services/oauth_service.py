import uuid
from typing import Optional

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from ..core.config import settings
from ..models.database import User
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
            token = await client.fetch_token(
                "https://oauth2.googleapis.com/token",
                code=code
            )

            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={
                        "Authorization": f"Bearer {token['access_token']}"}
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
            error_details = str(e)
            if "invalid_grant" in error_details.lower():
                error_details += f" | Redirect URI used: {redirect_uri} | Check Google Cloud Console configuration"

            print(f"Google OAuth Error Details: {error_details}")

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to authenticate with Google: {error_details}"
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
            token = await client.fetch_token(
                "https://github.com/login/oauth/access_token",
                code=code
            )

            async with httpx.AsyncClient() as http_client:
                user_response = await http_client.get(
                    "https://api.github.com/user",
                    headers={
                        "Authorization": f"Bearer {token['access_token']}"}
                )
                user_response.raise_for_status()
                user_info = user_response.json()

                email_response = await http_client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {token['access_token']}"}
                )
                email_response.raise_for_status()
                emails = email_response.json()

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
        provider: Optional[str] = None,
        provider_id: Optional[str] = None,
    ) -> User:
        """Create or get user from OAuth provider info
        
        Note: provider and provider_id are currently not stored in the database.
        The User model would need to be updated with OAuth provider fields
        to track which provider was used for authentication.
        """
        normalized_email = email.lower()
        
        existing_user = await auth_service.get_user_by_email(db, normalized_email)

        if existing_user:
            return existing_user

        random_password = str(uuid.uuid4())
        hashed_password = auth_service.get_password_hash(random_password)

        db_user = User(
            id=str(uuid.uuid4()),
            email=normalized_email,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            is_verified=True,
        )

        db.add(db_user)
        # Flush to get the ID without committing
        await db.flush()
        # Now we can safely return the user
        return db_user


oauth_service = OAuthService()
