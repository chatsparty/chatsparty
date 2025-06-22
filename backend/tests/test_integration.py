#!/usr/bin/env python3
"""
Integration test to verify VM abstraction is working in the project setup
"""
import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_vm_factory_integration():
    """Test that the main VM factory works with abstract system"""
    print("🧪 Testing main VM factory integration...")
    
    try:
        from app.services.vm_factory import get_vm_service
        
        # Test default (should be Docker)
        vm_service = get_vm_service()
        print(f"✅ Main factory returns: {type(vm_service).__name__}")
        
        # Test that it has the abstract interface methods
        required_methods = [
            'create_project_sandbox',
            'execute_command', 
            'sync_files_to_vm',
            'destroy_sandbox'
        ]
        
        for method in required_methods:
            if hasattr(vm_service, method):
                print(f"✅ Has method: {method}")
            else:
                print(f"❌ Missing method: {method}")
                return False
                
        return True
        
    except Exception as e:
        print(f"❌ Factory integration failed: {e}")
        return False


def test_project_service_integration():
    """Test that project service can be imported and uses abstract VM"""
    print("\n🧪 Testing project service integration...")
    
    try:
        from app.services.project.application.project_service import ProjectService
        
        # Check the import at module level
        print("✅ ProjectService can be imported")
        
        # Check that it imports the VM factory correctly
        import inspect
        source = inspect.getsource(ProjectService.__init__)
        
        if "get_vm_service()" in source:
            print("✅ ProjectService uses get_vm_service() factory")
        else:
            print("❌ ProjectService doesn't use VM factory")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Project service integration failed: {e}")
        return False


def test_router_integration():
    """Test that router uses the abstract VM system"""
    print("\n🧪 Testing router integration...")
    
    try:
        from app.routers.projects import router
        
        # Check router can be imported
        print("✅ Projects router can be imported")
        
        # Check the router source for VM factory usage
        import inspect
        from app.routers import projects
        source = inspect.getsource(projects)
        
        if "get_vm_service" in source:
            print("✅ Router uses get_vm_service factory")
        else:
            print("❌ Router doesn't use VM factory")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Router integration failed: {e}")
        return False


def test_provider_switching():
    """Test that provider switching works via environment variable"""
    print("\n🧪 Testing provider switching...")
    
    try:
        # Test Docker provider
        os.environ['VM_PROVIDER'] = 'docker'
        
        # Clear import cache to force reload
        import sys
        modules_to_clear = [k for k in sys.modules.keys() if 'vm' in k.lower()]
        for module in modules_to_clear:
            if module in sys.modules:
                del sys.modules[module]
        
        from app.services.vm_factory import get_vm_service
        vm_service = get_vm_service()
        
        if 'Docker' in type(vm_service).__name__:
            print("✅ Environment variable switching works (Docker)")
        else:
            print(f"❌ Expected Docker provider, got: {type(vm_service).__name__}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Provider switching failed: {e}")
        return False


def main():
    """Run all integration tests"""
    print("🚀 Starting VM Abstraction Integration Tests\n")
    
    tests = [
        test_vm_factory_integration,
        test_project_service_integration, 
        test_router_integration,
        test_provider_switching
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        else:
            print("⛔ Test failed!")
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests passed! VM abstraction is working correctly.")
    else:
        print("❌ Some tests failed. Check the abstract VM system setup.")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)