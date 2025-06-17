import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from ...ai.infrastructure.base_repository import BaseRepository
from ..domain.interfaces import UserRepositoryInterface
from ..domain.entities import User, UserCreate, UserUpdate
from ....models.database import User as UserModel


class UserRepository(BaseRepository, UserRepositoryInterface):
    def __init__(self, session: Session):
        super().__init__(session, UserModel)

    async def create(self, user_data: UserCreate, hashed_password: str) -> User:
        user_id = str(uuid.uuid4())
        db_user = UserModel(
            id=user_id,
            email=user_data.email,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name
        )
        self.session.add(db_user)
        self.session.commit()
        self.session.refresh(db_user)
        return self._to_entity(db_user)

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = self.session.execute(stmt)
        db_user = result.scalar_one_or_none()
        return self._to_entity(db_user) if db_user else None

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.email == email)
        result = self.session.execute(stmt)
        db_user = result.scalar_one_or_none()
        return self._to_entity(db_user) if db_user else None

    async def update(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = self.session.execute(stmt)
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            return None

        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)

        self.session.commit()
        self.session.refresh(db_user)
        return self._to_entity(db_user)

    async def delete(self, user_id: str) -> bool:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = self.session.execute(stmt)
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            return False

        self.session.delete(db_user)
        self.session.commit()
        return True

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        stmt = select(UserModel).offset(skip).limit(limit)
        result = self.session.execute(stmt)
        db_users = result.scalars().all()
        return [self._to_entity(db_user) for db_user in db_users]

    def _to_entity(self, db_user: UserModel) -> User:
        return User(
            id=db_user.id,
            email=db_user.email,
            first_name=db_user.first_name,
            last_name=db_user.last_name,
            is_active=db_user.is_active,
            is_verified=db_user.is_verified,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at
        )