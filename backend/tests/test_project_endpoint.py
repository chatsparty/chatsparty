#!/usr/bin/env python3
"""Test script to verify project endpoint functionality"""

import asyncio
import json
import httpx

async def test_create_project():
    """Test creating a project via the API"""
    
    # First, we need to get a token by logging in
    # For testing, use a test user or create one
    
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Create test user if needed
        try:
            register_response = await client.post(
                "/api/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "testpass123",
                    "first_name": "Test",
                    "last_name": "User"
                }
            )
            print(f"Register response: {register_response.status_code}")
        except:
            pass  # User might already exist
        
        # Login
        login_response = await client.post(
            "/api/auth/login",
            data={
                "username": "test@example.com",
                "password": "testpass123"
            }
        )
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test create project
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "auto_sync_files": True,
            "auto_setup_vm": False
        }
        
        create_response = await client.post(
            "/api/projects/",
            json=project_data,
            headers=headers
        )
        
        print(f"\nCreate project response:")
        print(f"Status: {create_response.status_code}")
        print(f"Response: {json.dumps(create_response.json(), indent=2)}")
        
        # Test get projects
        get_response = await client.get(
            "/api/projects/",
            headers=headers
        )
        
        print(f"\nGet projects response:")
        print(f"Status: {get_response.status_code}")
        print(f"Response: {json.dumps(get_response.json(), indent=2)}")

if __name__ == "__main__":
    asyncio.run(test_create_project())