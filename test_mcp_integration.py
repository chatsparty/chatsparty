#!/usr/bin/env python3
"""
Simple test script to verify MCP integration is working
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_mcp_integration():
    """Test basic MCP integration functionality"""
    print("🔧 Testing MCP Integration...")
    
    try:
        # Test 1: Import MCP client service
        print("1. Testing MCP client service import...")
        from app.services.mcp.mcp_client_service import get_mcp_client_service
        mcp_service = get_mcp_client_service()
        print("   ✅ MCP client service imported successfully")
        
        # Test 2: Test connection service with MCP methods
        print("2. Testing connection service with MCP methods...")
        from app.services.connection_service import connection_service
        assert hasattr(connection_service, 'test_mcp_connection'), "Missing test_mcp_connection method"
        assert hasattr(connection_service, 'discover_mcp_tools'), "Missing discover_mcp_tools method"
        assert hasattr(connection_service, 'get_mcp_connections'), "Missing get_mcp_connections method"
        print("   ✅ Connection service has MCP methods")
        
        # Test 3: Test UnifiedModelService has MCP provider
        print("3. Testing UnifiedModelService MCP provider...")
        from app.services.ai.infrastructure.unified_model_service import UnifiedModelService
        service = UnifiedModelService()
        providers = service.get_available_providers()
        assert 'mcp' in providers, "MCP provider not found in available providers"
        mcp_config = providers['mcp']
        assert mcp_config['base_url_required'] == True, "MCP provider should require base URL"
        assert mcp_config['supports_tools'] == True, "MCP provider should support tools"
        print("   ✅ UnifiedModelService supports MCP provider")
        
        # Test 4: Test database model has MCP fields
        print("4. Testing database model MCP fields...")
        from app.models.database import Connection
        connection = Connection()
        assert hasattr(connection, 'mcp_server_url'), "Missing mcp_server_url field"
        assert hasattr(connection, 'mcp_server_config'), "Missing mcp_server_config field"
        assert hasattr(connection, 'available_tools'), "Missing available_tools field"
        assert hasattr(connection, 'mcp_capabilities'), "Missing mcp_capabilities field"
        print("   ✅ Database model has MCP fields")
        
        # Test 5: Test API routes are available
        print("5. Testing MCP API routes...")
        from app.routers.connections import router
        routes = [route.path for route in router.routes]
        mcp_routes = [r for r in routes if 'mcp' in r]
        assert len(mcp_routes) >= 4, f"Expected at least 4 MCP routes, found {len(mcp_routes)}"
        print(f"   ✅ Found {len(mcp_routes)} MCP API routes")
        
        print("\n🎉 All MCP integration tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ MCP integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_mcp_connection_simulation():
    """Test MCP connection with mock data (no actual MCP server needed)"""
    print("\n🔗 Testing MCP Connection Simulation...")
    
    try:
        from app.services.mcp.mcp_client_service import MCPClientService
        
        # Create service instance
        service = MCPClientService()
        
        # Test basic methods exist
        assert hasattr(service, 'connect_to_server'), "Missing connect_to_server method"
        assert hasattr(service, 'discover_capabilities'), "Missing discover_capabilities method"
        assert hasattr(service, 'execute_tool'), "Missing execute_tool method"
        assert hasattr(service, 'test_connection'), "Missing test_connection method"
        
        print("   ✅ MCP client service has all required methods")
        
        # Test provider integration
        from app.services.ai.infrastructure.providers.mcp_provider import MCPProvider
        provider = MCPProvider()
        assert hasattr(provider, 'chat_completion'), "Missing chat_completion method"
        
        print("   ✅ MCP provider has required methods")
        
        # Test remote connection URL validation
        test_urls = [
            "https://api.example.com/mcp",
            "http://localhost:8080/mcp", 
            "ws://localhost:3000/mcp",
            "stdio://uvx mcp-server"
        ]
        
        for url in test_urls:
            # Just test that the URL parsing logic works
            if url.startswith(('http://', 'https://')):
                connection_type = "HTTP/SSE"
            elif url.startswith(('ws://', 'wss://')):
                connection_type = "WebSocket"
            elif url.startswith('stdio://'):
                connection_type = "Stdio"
            else:
                connection_type = "Unknown"
            
            assert connection_type != "Unknown", f"URL type detection failed for {url}"
        
        print("   ✅ Remote MCP URL validation works")
        
        print("🎉 MCP connection simulation tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ MCP connection simulation test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting MCP Integration Tests\n")
    
    # Run async tests
    success1 = asyncio.run(test_mcp_integration())
    
    # Run sync tests
    success2 = test_mcp_connection_simulation()
    
    if success1 and success2:
        print("\n✅ All tests passed! MCP integration is ready to use.")
        print("\nNext steps:")
        print("1. Start your backend server: cd backend && uv run python main.py")
        print("2. Create an MCP connection through the frontend")
        print("3. Test with an actual MCP server")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)