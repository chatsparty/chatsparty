import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from ..models.database import User
from ..models.auth import UserCreate, UserUpdate, TokenData
from ..core.config import settings


class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.secret_key
        self.algorithm = "HS256"
        self.access_token_expire_minutes = settings.access_token_expire_minutes
        self.refresh_token_expire_days = settings.refresh_token_expire_days

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str, token_type: str = "access") -> Optional[TokenData]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            exp: float = payload.get("exp")
            typ: str = payload.get("type")
            
            if user_id is None or typ != token_type:
                return None
            
            if exp is None or datetime.now(timezone.utc) > datetime.fromtimestamp(exp, timezone.utc):
                return None
                
            return TokenData(user_id=user_id)
        except JWTError:
            return None

    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Optional[User]:
        user = await self.get_user_by_email(db, email.lower())
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    async def create_user(self, db: AsyncSession, user_create: UserCreate) -> User:
        # Normalize email to lowercase
        normalized_email = user_create.email.lower()
        
        # Check if user already exists
        existing_user = await self.get_user_by_email(db, normalized_email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        hashed_password = self.get_password_hash(user_create.password)
        db_user = User(
            id=str(uuid.uuid4()),
            email=normalized_email,
            hashed_password=hashed_password,
            first_name=user_create.first_name,
            last_name=user_create.last_name,
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update_user(self, db: AsyncSession, user_id: str, user_update: UserUpdate) -> Optional[User]:
        user = await self.get_user_by_id(db, user_id)
        if not user:
            return None

        update_data = user_update.model_dump(exclude_unset=True)
        
        if "password" in update_data:
            update_data["hashed_password"] = self.get_password_hash(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(user, field, value)

        await db.commit()
        await db.refresh(user)
        return user


auth_service = AuthService()