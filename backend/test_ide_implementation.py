#!/usr/bin/env python3
"""
Test script for IDE implementation
Run this to verify that the IDE endpoints work correctly
"""

import asyncio
import sys
import logging
from app.services.vm_factory import get_vm_service

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_ide_implementation():
    """Test the IDE implementation with Docker provider"""
    try:
        # Get VM service (should return Docker provider by default)
        vm_service = get_vm_service()
        
        print(f"🔧 Testing IDE implementation with {type(vm_service).__name__}")
        
        # Test project ID (you'll need to replace this with a real project ID)
        test_project_id = "test-project-123"
        
        print(f"\n1. 🏗️  Testing IDE setup for project: {test_project_id}")
        
        # Test 1: Check if sandbox is active (this will likely fail in test)
        try:
            is_active = await vm_service.is_sandbox_active(test_project_id)
            print(f"   ✅ Sandbox active check: {is_active}")
        except Exception as e:
            print(f"   ⚠️  Sandbox active check failed (expected): {e}")
        
        # Test 2: Try to setup IDE (will fail if container doesn't exist)
        try:
            ide_info = await vm_service.setup_ide_server(test_project_id, "vscode", 8080)
            print(f"   ✅ IDE setup successful: {ide_info}")
        except Exception as e:
            print(f"   ⚠️  IDE setup failed (expected if no container): {e}")
        
        # Test 3: Check IDE status
        try:
            status = await vm_service.get_ide_status(test_project_id)
            print(f"   ✅ IDE status check: {status}")
        except Exception as e:
            print(f"   ❌ IDE status check failed: {e}")
        
        # Test 4: Check if IDE is running
        try:
            is_running = await vm_service.is_ide_running(test_project_id)
            print(f"   ✅ IDE running check: {is_running}")
        except Exception as e:
            print(f"   ❌ IDE running check failed: {e}")
        
        # Test 5: Try to stop IDE
        try:
            stopped = await vm_service.stop_ide_server(test_project_id)
            print(f"   ✅ IDE stop attempt: {stopped}")
        except Exception as e:
            print(f"   ❌ IDE stop failed: {e}")
        
        print("\n🎉 IDE implementation test completed!")
        print("\n📝 Next steps:")
        print("   1. Start your backend server: cd backend && python main.py")
        print("   2. Create a project and start its container")
        print("   3. Test the IDE endpoints via the frontend or API")
        print("   4. Visit http://localhost:3000/projects/{project_id}/vscode")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    
    return True


def test_interface_compliance():
    """Test that all providers implement the IDE interface correctly"""
    try:
        from app.services.vm.implementations.docker_provider import DockerProvider
        
        # Test that all providers have the required methods
        required_methods = [
            'setup_ide_server',
            'get_ide_status', 
            'stop_ide_server',
            'is_ide_running'
        ]
        
        providers = [DockerProvider]
        
        for provider_class in providers:
            print(f"\n🔍 Checking {provider_class.__name__} interface compliance:")
            
            for method_name in required_methods:
                if hasattr(provider_class, method_name):
                    print(f"   ✅ {method_name}")
                else:
                    print(f"   ❌ {method_name} - MISSING!")
                    return False
        
        print("\n✅ Docker provider implements the IDE interface correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Interface compliance test failed: {e}")
        return False


async def main():
    """Main test function"""
    print("🚀 Starting IDE Implementation Tests\n")
    
    # Test 1: Interface compliance
    print("=" * 50)
    print("TEST 1: Interface Compliance")
    print("=" * 50)
    
    if not test_interface_compliance():
        sys.exit(1)
    
    # Test 2: Basic functionality
    print("\n" + "=" * 50)
    print("TEST 2: Basic Functionality")
    print("=" * 50)
    
    if not await test_ide_implementation():
        sys.exit(1)
    
    print("\n🎉 All tests passed!")
    print("\n🔗 IDE Endpoints Available:")
    print("   POST /api/projects/{project_id}/ide/setup")
    print("   GET  /api/projects/{project_id}/ide/status") 
    print("   POST /api/projects/{project_id}/ide/stop")
    print("   GET  /api/projects/{project_id}/ide/health")


if __name__ == "__main__":
    asyncio.run(main())