"""
Base classes and utilities for the testing framework

This module provides base classes and utilities that make writing tests easier
and more consistent across your project.
"""

import asyncio
import aiohttp
import time
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from unittest.mock import Mock
from contextlib import asynccontextmanager

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from testing_framework.test_config import get_test_config, TEST_USERS

class TestBase:
    """Base class for all tests - provides common functionality"""
    
    def __init__(self):
        self.config = get_test_config()
        self.base_url = self.config['backend']['base_url']
        self.auth_token = None
        self.test_data = {}
        
    def setup(self):
        """Override this method for test setup"""
        pass
    
    def teardown(self):
        """Override this method for test cleanup"""
        pass
    
    def assert_response_ok(self, response, expected_status=200):
        """Assert that an HTTP response is successful"""
        assert response.status == expected_status, f"Expected {expected_status}, got {response.status}"
    
    def assert_json_contains(self, json_data: dict, expected_keys: List[str]):
        """Assert that JSON data contains expected keys"""
        for key in expected_keys:
            assert key in json_data, f"Missing key: {key}"
    
    def assert_valid_uuid(self, uuid_string: str):
        """Assert that a string is a valid UUID"""
        import uuid
        try:
            uuid.UUID(uuid_string)
        except ValueError:
            assert False, f"Invalid UUID: {uuid_string}"

class AsyncTestBase(TestBase):
    """Base class for async tests"""
    
    async def async_setup(self):
        """Override this method for async test setup"""
        pass
    
    async def async_teardown(self):
        """Override this method for async test cleanup"""
        pass

class APITestBase(AsyncTestBase):
    """Base class for API tests - provides HTTP client functionality"""
    
    def __init__(self):
        super().__init__()
        self.session = None
    
    async def async_setup(self):
        """Set up HTTP session"""
        self.session = aiohttp.ClientSession()
        await super().async_setup()
    
    async def async_teardown(self):
        """Clean up HTTP session"""
        if self.session:
            await self.session.close()
        await super().async_teardown()
    
    async def login_as_test_user(self, user_type: str = "regular") -> str:
        """Login as a test user and return auth token"""
        user_data = TEST_USERS[user_type]
        
        login_payload = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        async with self.session.post(
            f"{self.base_url}/auth/login",
            json=login_payload
        ) as response:
            if response.status == 200:
                data = await response.json()
                self.auth_token = data.get("access_token")
                return self.auth_token
            else:
                # Try to register the user first
                await self.register_test_user(user_type)
                # Then try login again
                async with self.session.post(
                    f"{self.base_url}/auth/login",
                    json=login_payload
                ) as retry_response:
                    assert retry_response.status == 200, f"Login failed: {await retry_response.text()}"
                    data = await retry_response.json()
                    self.auth_token = data.get("access_token")
                    return self.auth_token
    
    async def register_test_user(self, user_type: str = "regular"):
        """Register a test user"""
        user_data = TEST_USERS[user_type]
        
        register_payload = {
            "email": user_data["email"],
            "password": user_data["password"],
            "first_name": user_data["first_name"],
            "last_name": user_data["last_name"]
        }
        
        async with self.session.post(
            f"{self.base_url}/auth/register",
            json=register_payload
        ) as response:
            # 200 (success) or 409 (already exists) are both OK
            assert response.status in [200, 201, 409], f"Registration failed: {await response.text()}"
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if not self.auth_token:
            raise ValueError("No auth token available. Call login_as_test_user() first.")
        
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }
    
    async def get(self, endpoint: str, **kwargs) -> aiohttp.ClientResponse:
        """Make authenticated GET request"""
        headers = kwargs.pop('headers', {})
        if self.auth_token:
            headers.update(self.get_auth_headers())
        
        return await self.session.get(
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )
    
    async def post(self, endpoint: str, **kwargs) -> aiohttp.ClientResponse:
        """Make authenticated POST request"""
        headers = kwargs.pop('headers', {})
        if self.auth_token:
            headers.update(self.get_auth_headers())
        
        return await self.session.post(
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )
    
    async def put(self, endpoint: str, **kwargs) -> aiohttp.ClientResponse:
        """Make authenticated PUT request"""
        headers = kwargs.pop('headers', {})
        if self.auth_token:
            headers.update(self.get_auth_headers())
        
        return await self.session.put(
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )
    
    async def delete(self, endpoint: str, **kwargs) -> aiohttp.ClientResponse:
        """Make authenticated DELETE request"""
        headers = kwargs.pop('headers', {})
        if self.auth_token:
            headers.update(self.get_auth_headers())
        
        return await self.session.delete(
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )

class ProjectTestBase(APITestBase):
    """Base class for project-related tests"""
    
    def __init__(self):
        super().__init__()
        self.test_projects = []
    
    async def create_test_project(self, name: Optional[str] = None) -> Dict[str, Any]:
        """Create a test project and return project data"""
        if not name:
            name = f"Test Project {int(time.time())}"
        
        project_data = {
            "name": name,
            "description": "Test project created by testing framework"
        }
        
        async with await self.post("/api/projects", json=project_data) as response:
            assert response.status in [200, 201], f"Failed to create project: {await response.text()}"
            data = await response.json()
            project = data["project"]
            self.test_projects.append(project["id"])
            return project
    
    async def setup_project_vm(self, project_id: str):
        """Set up VM for a test project"""
        async with await self.post(f"/api/projects/{project_id}/vm/setup") as response:
            assert response.status == 200, f"Failed to setup VM: {await response.text()}"
            return await response.json()
    
    async def cleanup_test_projects(self):
        """Clean up all test projects"""
        for project_id in self.test_projects:
            try:
                # Delete project (this should also clean up VM)
                async with await self.delete(f"/api/projects/{project_id}") as response:
                    pass  # Ignore errors during cleanup
            except Exception:
                pass  # Ignore cleanup errors
        
        self.test_projects.clear()
    
    async def async_teardown(self):
        """Clean up projects and parent resources"""
        await self.cleanup_test_projects()
        await super().async_teardown()

class FileTestBase(ProjectTestBase):
    """Base class for file operation tests"""
    
    def __init__(self):
        super().__init__()
        self.test_files = []
    
    async def create_test_file_in_project(self, project_id: str, filename: str, content: str = "test content") -> str:
        """Create a test file in a project and return the file path"""
        from app.services.vm.vm_factory import get_vm_service
        
        vm_service = get_vm_service()
        file_path = f"/workspace/{filename}"
        
        # Create file using VM service
        result = await vm_service.execute_command(
            project_id,
            f"echo '{content}' > {file_path}"
        )
        
        assert result.exit_code == 0, f"Failed to create test file: {result.stderr}"
        
        self.test_files.append((project_id, file_path))
        return file_path
    
    async def verify_file_exists(self, project_id: str, file_path: str) -> bool:
        """Verify that a file exists in the project"""
        from app.services.vm.vm_factory import get_vm_service
        
        vm_service = get_vm_service()
        result = await vm_service.execute_command(
            project_id,
            f"test -f {file_path} && echo 'EXISTS' || echo 'NOT_EXISTS'"
        )
        
        return "EXISTS" in result.stdout
    
    async def verify_file_deleted(self, project_id: str, file_path: str) -> bool:
        """Verify that a file has been deleted"""
        return not await self.verify_file_exists(project_id, file_path)
    
    async def cleanup_test_files(self):
        """Clean up all test files"""
        from app.services.vm.vm_factory import get_vm_service
        
        vm_service = get_vm_service()
        
        for project_id, file_path in self.test_files:
            try:
                await vm_service.execute_command(
                    project_id,
                    f"rm -f {file_path}"
                )
            except Exception:
                pass  # Ignore cleanup errors
        
        self.test_files.clear()
    
    async def async_teardown(self):
        """Clean up files and parent resources"""
        await self.cleanup_test_files()
        await super().async_teardown()

class PerformanceTestBase(AsyncTestBase):
    """Base class for performance tests"""
    
    def __init__(self):
        super().__init__()
        self.performance_data = []
    
    async def measure_time(self, operation_name: str, operation_func):
        """Measure the execution time of an operation"""
        start_time = time.time()
        
        if asyncio.iscoroutinefunction(operation_func):
            result = await operation_func()
        else:
            result = operation_func()
        
        duration = time.time() - start_time
        
        self.performance_data.append({
            'operation': operation_name,
            'duration': duration,
            'timestamp': time.time()
        })
        
        return result, duration
    
    def assert_performance_threshold(self, operation_name: str, max_duration: float):
        """Assert that an operation completed within the time threshold"""
        relevant_data = [d for d in self.performance_data if d['operation'] == operation_name]
        assert relevant_data, f"No performance data found for operation: {operation_name}"
        
        latest = relevant_data[-1]
        assert latest['duration'] <= max_duration, \
            f"Operation '{operation_name}' took {latest['duration']:.3f}s, expected <= {max_duration}s"

# Utility functions for common test patterns

def create_mock_user(user_id: str = "test-user-123") -> Mock:
    """Create a mock user for testing"""
    mock_user = Mock()
    mock_user.id = user_id
    mock_user.email = "test@example.com"
    mock_user.first_name = "Test"
    mock_user.last_name = "User"
    mock_user.is_active = True
    mock_user.is_verified = True
    return mock_user

def create_mock_project(project_id: str = "test-project-123", user_id: str = "test-user-123") -> Mock:
    """Create a mock project for testing"""
    mock_project = Mock()
    mock_project.id = project_id
    mock_project.name = "Test Project"
    mock_project.description = "Test project description"
    mock_project.owner_id = user_id
    mock_project.vm_status = "active"
    return mock_project

@asynccontextmanager
async def temporary_test_file(project_id: str, filename: str, content: str = "test"):
    """Context manager for creating and cleaning up a temporary test file"""
    from app.services.vm.vm_factory import get_vm_service
    
    vm_service = get_vm_service()
    file_path = f"/workspace/{filename}"
    
    try:
        # Create file
        result = await vm_service.execute_command(
            project_id,
            f"echo '{content}' > {file_path}"
        )
        assert result.exit_code == 0, f"Failed to create temporary file: {result.stderr}"
        
        yield file_path
        
    finally:
        # Clean up
        try:
            await vm_service.execute_command(project_id, f"rm -f {file_path}")
        except Exception:
            pass  # Ignore cleanup errors

async def wait_for_condition(condition_func, timeout: float = 10.0, check_interval: float = 0.1):
    """Wait for a condition to become true"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if asyncio.iscoroutinefunction(condition_func):
            if await condition_func():
                return True
        else:
            if condition_func():
                return True
        
        await asyncio.sleep(check_interval)
    
    return False

def assert_valid_project_data(project_data: Dict[str, Any]):
    """Assert that project data has the expected structure"""
    required_fields = ["id", "name", "description", "created_at", "updated_at"]
    for field in required_fields:
        assert field in project_data, f"Missing required field: {field}"

def assert_valid_file_data(file_data: Dict[str, Any]):
    """Assert that file data has the expected structure"""
    required_fields = ["name", "path", "size", "modified"]
    for field in required_fields:
        assert field in file_data, f"Missing required field: {field}"