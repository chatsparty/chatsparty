"""Domain service for handling API key encryption."""

from typing import Optional
from ..value_objects import EncryptedApiKey
from ....shared.crypto_service import crypto_service


class EncryptionService:
    """Service for encrypting and decrypting API keys."""
    
    @staticmethod
    def encrypt_api_key(plain_key: Optional[str]) -> EncryptedApiKey:
        """Encrypt an API key."""
        if plain_key is None or plain_key == "":
            return EncryptedApiKey.create_unencrypted(plain_key)
        
        try:
            encrypted_value = crypto_service.encrypt(plain_key)
            return EncryptedApiKey.create_encrypted(encrypted_value)
        except Exception as e:
            raise ValueError(f"Failed to encrypt API key: {str(e)}")
    
    @staticmethod
    def decrypt_api_key(encrypted_key: EncryptedApiKey) -> Optional[str]:
        """Decrypt an API key."""
        if not encrypted_key.is_encrypted or encrypted_key.is_empty():
            return encrypted_key.value
        
        try:
            return crypto_service.decrypt(encrypted_key.value)
        except Exception as e:
            print(f"Warning: Failed to decrypt API key: {e}")
            return None