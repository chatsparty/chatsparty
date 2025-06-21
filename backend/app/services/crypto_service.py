"""
Crypto service for encrypting and decrypting sensitive data like API keys.
Uses AES encryption with a master key from environment variables.
"""

import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class CryptoService:
    """Service for encrypting and decrypting sensitive data."""
    
    def __init__(self):
        self._fernet = None
        self._initialized = False
    
    def _ensure_initialized(self) -> None:
        """Ensure the encryption service is initialized."""
        if self._initialized:
            return
            
        master_key = None
        
        try:
            from ..core.config import settings
            master_key = settings.encryption_master_key
        except ImportError:
            pass
        
        if not master_key:
            try:
                from dotenv import load_dotenv
                load_dotenv()
            except ImportError:
                pass
            
            master_key = os.getenv("ENCRYPTION_MASTER_KEY")
        
        if not master_key:
            raise ValueError(
                "ENCRYPTION_MASTER_KEY environment variable is required. "
                "Generate one using: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        try:
            self._fernet = Fernet(master_key.encode())
        except Exception:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'wisty_connections_salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
            self._fernet = Fernet(key)
        
        self._initialized = True
    
    def encrypt(self, plaintext: Optional[str]) -> Optional[str]:
        """
        Encrypt a plaintext string.
        
        Args:
            plaintext: The string to encrypt. Can be None.
            
        Returns:
            The encrypted string encoded as base64, or empty string if input was empty.
        """
        if plaintext is None:
            return None
        if plaintext == "":
            return ""
        
        self._ensure_initialized()
        
        try:
            encrypted_bytes = self._fernet.encrypt(plaintext.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            raise ValueError(f"Failed to encrypt data: {str(e)}")
    
    def decrypt(self, encrypted_text: Optional[str]) -> Optional[str]:
        """
        Decrypt an encrypted string.
        
        Args:
            encrypted_text: The encrypted string (base64 encoded). Can be None.
            
        Returns:
            The decrypted plaintext string, or None if input was None.
        """
        if encrypted_text is None:
            return None
        if encrypted_text == "":
            return ""
        
        self._ensure_initialized()
        
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_text.encode('utf-8'))
            decrypted_bytes = self._fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Failed to decrypt data: {str(e)}")
    
    def is_encrypted(self, text: Optional[str]) -> bool:
        """
        Check if a string appears to be encrypted (base64 encoded).
        
        Args:
            text: The string to check.
            
        Returns:
            True if the string appears to be encrypted, False otherwise.
        """
        if not text:
            return False
        
        try:
            base64.urlsafe_b64decode(text.encode('utf-8'))
            return True
        except Exception:
            return False


crypto_service = CryptoService()