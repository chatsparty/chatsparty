from typing import Optional, List
from passlib.context import CryptContext

from ..domain.interfaces import UserRepositoryInterface
from ..domain.entities import User, UserCreate, UserUpdate, UserResponse


class UserService:
    def __init__(self, user_repository: UserRepositoryInterface):
        self.user_repository = user_repository
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async def create_user(self, user_data: UserCreate) -> UserResponse:
        hashed_password = self._hash_password(user_data.password)
        user = await self.user_repository.create(user_data, hashed_password)
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )

    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            return None
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )

    async def get_user_by_email(self, email: str) -> Optional[User]:
        return await self.user_repository.get_by_email(email)

    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[UserResponse]:
        user = await self.user_repository.update(user_id, user_data)
        if not user:
            return None
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )

    async def delete_user(self, user_id: str) -> bool:
        return await self.user_repository.delete(user_id)

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[UserResponse]:
        users = await self.user_repository.list_all(skip, limit)
        return [
            UserResponse(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at
            )
            for user in users
        ]

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)