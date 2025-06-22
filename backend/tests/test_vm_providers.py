#!/usr/bin/env python3
"""
Test script for VM providers

This script tests the abstract VM provider system with both Docker and Fly.io providers.
"""
import os
import sys
import asyncio
import logging

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.vm import VMProviderFactory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_provider(provider_type: str):
    """Test a specific VM provider"""
    print(f"\n{'='*50}")
    print(f"Testing {provider_type.upper()} Provider")
    print(f"{'='*50}")
    
    try:
        # Create provider instance
        provider = VMProviderFactory.create_provider(provider_type)
        print(f"✅ Successfully created {provider_type} provider")
        
        # Test basic functionality (without actually creating VMs)
        project_id = "test-project-123"
        
        # Test is_sandbox_active (should work without creating VM)
        is_active = provider.is_sandbox_active(project_id)
        print(f"✅ is_sandbox_active check: {is_active}")
        
        # Test get_sandbox_info (should return None for non-existent project)
        info = await provider.get_sandbox_info(project_id)
        print(f"✅ get_sandbox_info: {info}")
        
        print(f"✅ {provider_type} provider basic tests passed")
        
    except Exception as e:
        print(f"❌ {provider_type} provider test failed: {e}")
        logger.exception(f"Error testing {provider_type} provider")


async def test_factory():
    """Test the VM provider factory"""
    print(f"\n{'='*50}")
    print("Testing VM Provider Factory")
    print(f"{'='*50}")
    
    try:
        # Test available providers
        providers = VMProviderFactory.get_available_providers()
        print(f"✅ Available providers: {providers}")
        
        # Test environment variable detection
        os.environ['VM_PROVIDER'] = 'docker'
        default_provider = VMProviderFactory.create_provider()
        print(f"✅ Default provider (docker): {type(default_provider).__name__}")
        
        # Test invalid provider
        try:
            VMProviderFactory.create_provider('invalid')
            print("❌ Should have failed with invalid provider")
        except ValueError as e:
            print(f"✅ Correctly rejected invalid provider: {e}")
        
        print("✅ Factory tests passed")
        
    except Exception as e:
        print(f"❌ Factory test failed: {e}")
        logger.exception("Error testing factory")


async def main():
    """Main test function"""
    print("🚀 Starting VM Provider Tests")
    
    # Test factory
    await test_factory()
    
    # Test individual providers
    await test_provider('docker')
    
    # Only test Fly.io if token is available
    if os.getenv('FLY_TOKEN'):
        await test_provider('fly')
    else:
        print(f"\n{'='*50}")
        print("SKIPPING FLY.IO TESTS - No FLY_TOKEN found")
        print("Set FLY_TOKEN environment variable to test Fly.io provider")
        print(f"{'='*50}")
    
    print(f"\n{'='*50}")
    print("🎉 VM Provider Tests Complete!")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())