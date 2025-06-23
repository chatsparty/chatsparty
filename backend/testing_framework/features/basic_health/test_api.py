"""
Basic health check tests - these should always pass
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from testing_framework.test_base import APITestBase


async def test_health_endpoint():
    """Test that the health endpoint is working"""
    test = APITestBase()
    await test.async_setup()
    
    try:
        async with await test.session.get(f"{test.base_url}/health") as response:
            assert response.status == 200
            data = await response.json()
            assert "status" in data
            
    finally:
        await test.async_teardown()


async def test_api_is_responsive():
    """Test that the API is responsive"""
    test = APITestBase()
    await test.async_setup()
    
    try:
        # Simple connectivity test
        async with await test.session.get(test.base_url) as response:
            # Any response (even 404) means server is running
            assert response.status < 500, "Server should be responsive"
            
    finally:
        await test.async_teardown()