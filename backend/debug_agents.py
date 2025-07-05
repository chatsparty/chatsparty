#!/usr/bin/env python3
"""
Debug script to check agent configurations and their providers
"""

import asyncio
from app.services.ai_service import get_ai_service
from app.core.config import settings

async def debug_agents():
    print("🔍 Agent Configuration Debugger")
    print("=" * 50)
    
    ai_service = get_ai_service()
    
    # Check default connection
    print(f"📋 Default Configuration:")
    print(f"   Provider: {settings.chatsparty_default_provider}")
    print(f"   Model: {settings.chatsparty_default_model}")
    print(f"   Vertex AI Project: {settings.google_cloud_project}")
    print(f"   Vertex AI Location: {settings.vertex_ai_location}")
    print()
    
    # List all agents for a test user
    try:
        agents = ai_service.list_agents("debug_user")
        print(f"🤖 Found {len(agents)} agents:")
        
        for i, agent in enumerate(agents):
            print(f"\n   Agent {i+1}: {agent.get('name', 'Unnamed')}")
            print(f"   ID: {agent.get('agent_id', 'No ID')}")
            print(f"   Connection: {agent.get('connection_id', 'No connection')}")
            
            # Get the actual agent object to check model config
            if agent.get('agent_id'):
                agent_obj = ai_service.get_agent(agent['agent_id'], "debug_user")
                if agent_obj and agent_obj.ai_model_config:
                    print(f"   Provider: {agent_obj.ai_model_config.provider}")
                    print(f"   Model: {agent_obj.ai_model_config.model_name}")
                else:
                    print(f"   Provider: Unknown (no model config)")
                    
    except Exception as e:
        print(f"❌ Error getting agents: {e}")
    
    print("\n" + "=" * 50)
    print("💡 Tips:")
    print("   - Agents with provider 'chatsparty' now use Vertex AI automatically")
    print("   - Agents with provider 'vertex_ai' use Vertex AI directly")
    print("   - Agents with provider 'gemini' still use direct API (may have rate limits)")

if __name__ == "__main__":
    asyncio.run(debug_agents())