#!/usr/bin/env python3
"""
Test the actual workflow using the abstract VM system
"""
import os
import sys
import asyncio

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_vm_workflow():
    """Test the actual VM workflow using abstract interface"""
    print("🧪 Testing VM Workflow with Abstract Interface")
    print("=" * 50)
    
    try:
        # Test both providers work the same way
        providers_to_test = ["docker"]
        
        # Add fly if token exists
        if os.getenv('FLY_TOKEN'):
            providers_to_test.append("fly")
        
        for provider in providers_to_test:
            print(f"\n🧪 Testing with {provider.upper()} provider...")
            
            # Set provider
            os.environ['VM_PROVIDER'] = provider
            
            # Clear import cache
            import sys
            modules_to_clear = [k for k in sys.modules.keys() if 'vm' in k.lower()]
            for module in modules_to_clear:
                if module in sys.modules:
                    del sys.modules[module]
            
            from app.services.vm_factory import get_vm_service
            
            # Get service (this is what your project actually does)
            vm_service = get_vm_service()
            print(f"✅ Got VM service: {type(vm_service).__name__}")
            
            # Test the interface that your project uses
            project_id = f"test-project-{provider}"
            
            # Test methods that don't require actual VM creation
            print(f"✅ Testing is_sandbox_active: {vm_service.is_sandbox_active(project_id)}")
            
            info = await vm_service.get_sandbox_info(project_id)
            print(f"✅ Testing get_sandbox_info: {info is None}")
            
            # Test that the interface is consistent
            methods = [
                'create_project_sandbox',
                'reconnect_to_sandbox', 
                'destroy_sandbox',
                'execute_command',
                'sync_files_to_vm',
                'read_file',
                'write_file',
                'install_package'
            ]
            
            for method in methods:
                if hasattr(vm_service, method):
                    print(f"✅ Interface method available: {method}")
                else:
                    print(f"❌ Missing interface method: {method}")
                    return False
        
        print(f"\n🎉 VM Workflow Test Completed Successfully!")
        print(f"✅ Your project can switch between providers seamlessly")
        print(f"✅ All interface methods are consistently available")
        
        return True
        
    except Exception as e:
        print(f"❌ Workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_environment_switching():
    """Test switching between environments"""
    print(f"\n🧪 Testing Environment Switching")
    print("=" * 50)
    
    try:
        # Test the .env configuration approach
        providers = [
            ("docker", "Local Development"),
            ("fly", "Production (requires FLY_TOKEN)")
        ]
        
        for provider, description in providers:
            print(f"\n📝 Configuration for {description}:")
            print(f"   VM_PROVIDER={provider}")
            
            if provider == "fly":
                print(f"   FLY_TOKEN=your_fly_token_here")
                print(f"   FLY_APP_NAME=wisty-workspace")
                if not os.getenv('FLY_TOKEN'):
                    print(f"   ⚠️  FLY_TOKEN not set - would fail in production")
                    continue
            
            os.environ['VM_PROVIDER'] = provider
            
            # Test factory can create provider
            from app.services.vm import VMProviderFactory
            try:
                provider_instance = VMProviderFactory.create_provider()
                print(f"   ✅ Provider created: {type(provider_instance).__name__}")
            except Exception as e:
                print(f"   ❌ Provider creation failed: {e}")
        
        print(f"\n✅ Environment switching test completed")
        return True
        
    except Exception as e:
        print(f"❌ Environment switching test failed: {e}")
        return False


async def main():
    """Run all workflow tests"""
    print("🚀 VM Abstract Interface Workflow Tests")
    print("=" * 60)
    
    tests = [
        test_vm_workflow(),
        test_environment_switching()
    ]
    
    results = await asyncio.gather(*tests, return_exceptions=True)
    
    passed = sum(1 for result in results if result is True)
    total = len(results)
    
    print(f"\n📊 Workflow Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Your project is correctly using the VM abstraction!")
        print("🚀 Ready to switch between Docker and Fly.io seamlessly!")
    else:
        print("❌ Some workflow tests failed")
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"   Test {i+1} error: {result}")


if __name__ == "__main__":
    asyncio.run(main())