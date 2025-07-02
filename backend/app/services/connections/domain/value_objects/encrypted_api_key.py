"""Value object for encrypted API keys."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class EncryptedApiKey:
    """Value object representing an encrypted API key."""
    
    value: Optional[str]
    is_encrypted: bool
    
    @staticmethod
    def create_encrypted(encrypted_value: str) -> "EncryptedApiKey":
        """Create an encrypted API key."""
        return EncryptedApiKey(value=encrypted_value, is_encrypted=True)
    
    @staticmethod
    def create_unencrypted(plain_value: Optional[str]) -> "EncryptedApiKey":
        """Create an unencrypted API key."""
        return EncryptedApiKey(value=plain_value, is_encrypted=False)
    
    def is_empty(self) -> bool:
        """Check if the API key is empty."""
        return self.value is None or self.value == ""