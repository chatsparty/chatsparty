from abc import ABC, abstractmethod
from typing import Optional, List
from .entities import User, UserCreate, UserUpdate


class UserRepositoryInterface(ABC):
    @abstractmethod
    async def create(self, user_data: UserCreate, hashed_password: str) -> User:
        pass

    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def update(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        pass

    @abstractmethod
    async def delete(self, user_id: str) -> bool:
        pass

    @abstractmethod
    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        pass