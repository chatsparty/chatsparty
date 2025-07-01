import aiohttp
import logging
from typing import Dict, Any, Optional
from .config import GoogleCloudConfig

logger = logging.getLogger(__name__)


class GoogleCloudHttpClient:
    """HTTP client wrapper for Google Cloud TTS API requests"""
    
    def __init__(self):
        self.config = GoogleCloudConfig()
    
    async def make_request(
        self,
        method: str,
        url: str,
        headers: Dict[str, str],
        json_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Google Cloud TTS API
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            headers: Request headers
            json_data: JSON data for request body
            
        Returns:
            Response dictionary with success status and data/error
        """
        async with aiohttp.ClientSession() as session:
            try:
                logger.debug(f"Making {method} request to {url}")
                if json_data:
                    logger.debug(f"Request data: {json_data}")
                
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json_data,
                    timeout=aiohttp.ClientTimeout(total=self.config.REQUEST_TIMEOUT)
                ) as response:
                    response_text = await response.text()
                    logger.debug(f"Response status: {response.status}")
                    logger.debug(f"Response text: {response_text}")
                    
                    if response.status == 200:
                        return {
                            "success": True,
                            "data": await response.json()
                        }
                    else:
                        return self._handle_error_response(response, response_text)
            
            except aiohttp.ClientError as e:
                logger.error(f"HTTP request failed: {str(e)}")
                return {
                    "success": False,
                    "error": f"Network error: {str(e)}"
                }
            except Exception as e:
                logger.error(f"Unexpected error in HTTP request: {str(e)}")
                return {
                    "success": False,
                    "error": f"Unexpected error: {str(e)}"
                }
    
    def _handle_error_response(self, response, response_text: str) -> Dict[str, Any]:
        """
        Handle error responses from the API
        
        Args:
            response: aiohttp response object
            response_text: Response text content
            
        Returns:
            Error response dictionary
        """
        error_data = None
        try:
            error_data = response.json()
        except:
            pass
        
        error_message = "Unknown error"
        if error_data and "error" in error_data:
            error_message = error_data["error"].get("message", error_message)
        
        logger.error(f"Google Cloud API error: {error_message}")
        logger.error(f"Full response: {response_text}")
        
        return {
            "success": False,
            "error": error_message,
            "status_code": response.status,
            "response": response_text
        }
    
    def get_headers(self, api_key: str) -> Dict[str, str]:
        """
        Get headers for API requests
        
        Args:
            api_key: Google Cloud API key
            
        Returns:
            Headers dictionary
        """
        if not api_key:
            logger.warning("No API key provided for Google Cloud TTS")
        else:
            logger.debug(f"Using API key starting with: {api_key[:10]}...")
        
        return self.config.get_default_headers(api_key)
    
    def get_base_url(self, custom_base_url: Optional[str] = None) -> str:
        """
        Get the base URL for API requests
        
        Args:
            custom_base_url: Custom base URL to use instead of default
            
        Returns:
            Base URL string
        """
        if custom_base_url:
            return custom_base_url.rstrip("/")
        return self.config.DEFAULT_BASE_URL