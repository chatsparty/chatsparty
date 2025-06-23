"""
API tests for file_operations feature - REAL WORKING TESTS

These tests verify the file operations API endpoints work correctly,
including the recent delete functionality fix.
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from testing_framework.test_base import FileTestBase


class TestFileOperationsAPI(FileTestBase):
    """API tests for file operations endpoints"""
    
    async def async_setup(self):
        """Set up test fixtures"""
        await super().async_setup()
        await self.login_as_test_user("regular")
        
        # Create a test project
        self.test_project = await self.create_test_project("File Operations Test Project")
        self.project_id = self.test_project["id"]
        
        # Set up VM for the project
        await self.setup_project_vm(self.project_id)


async def test_file_upload_api():
    """Test file upload API endpoint"""
    test_instance = TestFileOperationsAPI()
    await test_instance.async_setup()
    
    try:
        # TODO: Implement file upload test when endpoint is ready
        # For now, just verify project was created
        assert test_instance.project_id is not None
        assert test_instance.test_project["name"] == "File Operations Test Project"
        
    finally:
        await test_instance.async_teardown()


async def test_file_list_api():
    """Test file listing API endpoint"""
    test_instance = TestFileOperationsAPI()
    await test_instance.async_setup()
    
    try:
        # Create a test file
        test_file = await test_instance.create_test_file_in_project(
            test_instance.project_id,
            "test_list.txt",
            "Content for list test"
        )
        
        # Get file list via API
        async with await test_instance.get(f"/api/projects/{test_instance.project_id}/files") as response:
            assert response.status == 200
            data = await response.json()
            
            # Verify response structure
            assert "files" in data
            files = data["files"]
            
            # Should find our test file
            test_files = [f for f in files if f.get("name") == "test_list.txt"]
            assert len(test_files) > 0, "Test file not found in file list"
            
    finally:
        await test_instance.async_teardown()


async def test_file_delete_api():
    """Test file deletion API endpoint - CRITICAL TEST"""
    test_instance = TestFileOperationsAPI()
    await test_instance.async_setup()
    
    try:
        # Create a test file
        test_file = await test_instance.create_test_file_in_project(
            test_instance.project_id,
            "test_delete.txt",
            "Content that should be deleted"
        )
        
        # Verify file exists before deletion
        file_exists_before = await test_instance.verify_file_exists(
            test_instance.project_id,
            test_file
        )
        assert file_exists_before, "Test file should exist before deletion"
        
        # Delete file via API
        delete_payload = {
            "path": test_file,
            "is_folder": False,
            "recursive": False
        }
        
        async with await test_instance.delete(
            f"/api/projects/{test_instance.project_id}/files/delete",
            json=delete_payload
        ) as response:
            assert response.status == 200, f"Delete API failed: {await response.text()}"
            
            data = await response.json()
            assert data.get("success") == True, "API should report success"
            assert "deleted successfully" in data.get("message", "").lower()
        
        # CRITICAL: Verify file is actually deleted (not just API success)
        file_exists_after = await test_instance.verify_file_exists(
            test_instance.project_id,
            test_file
        )
        assert not file_exists_after, "File should be actually deleted from container"
        
    finally:
        await test_instance.async_teardown()


async def test_folder_delete_api():
    """Test folder deletion API endpoint"""
    test_instance = TestFileOperationsAPI()
    await test_instance.async_setup()
    
    try:
        # Create a test folder with a file inside
        from app.services.vm.vm_factory import get_vm_service
        vm_service = get_vm_service()
        
        folder_path = "/workspace/test_folder"
        file_in_folder = f"{folder_path}/file_inside.txt"
        
        # Create folder and file
        await vm_service.execute_command(
            test_instance.project_id,
            f"mkdir -p {folder_path}"
        )
        await vm_service.execute_command(
            test_instance.project_id,
            f"echo 'File inside folder' > {file_in_folder}"
        )
        
        # Verify folder exists
        folder_check = await vm_service.execute_command(
            test_instance.project_id,
            f"test -d {folder_path} && echo 'EXISTS'"
        )
        assert "EXISTS" in folder_check.stdout, "Test folder should exist"
        
        # Delete folder via API
        delete_payload = {
            "path": folder_path,
            "is_folder": True,
            "recursive": True
        }
        
        async with await test_instance.delete(
            f"/api/projects/{test_instance.project_id}/files/delete",
            json=delete_payload
        ) as response:
            assert response.status == 200, f"Folder delete API failed: {await response.text()}"
            
            data = await response.json()
            assert data.get("success") == True, "API should report success"
        
        # Verify folder is actually deleted
        folder_check_after = await vm_service.execute_command(
            test_instance.project_id,
            f"test -d {folder_path} && echo 'STILL_EXISTS' || echo 'DELETED'"
        )
        assert "DELETED" in folder_check_after.stdout, "Folder should be actually deleted"
        
    finally:
        await test_instance.async_teardown()


async def test_delete_nonexistent_file():
    """Test deleting a file that doesn't exist"""
    test_instance = TestFileOperationsAPI()
    await test_instance.async_setup()
    
    try:
        # Try to delete a file that doesn't exist
        nonexistent_file = "/workspace/does_not_exist.txt"
        
        delete_payload = {
            "path": nonexistent_file,
            "is_folder": False,
            "recursive": False
        }
        
        async with await test_instance.delete(
            f"/api/projects/{test_instance.project_id}/files/delete",
            json=delete_payload
        ) as response:
            # Should succeed (rm -f behavior)
            assert response.status == 200, "Deleting nonexistent file should succeed"
            
            data = await response.json()
            assert data.get("success") == True, "Should report success for nonexistent file"
        
    finally:
        await test_instance.async_teardown()


async def test_delete_without_auth():
    """Test that delete requires authentication"""
    test_instance = TestFileOperationsAPI()
    await test_instance.async_setup()
    
    try:
        # Create a test file
        test_file = await test_instance.create_test_file_in_project(
            test_instance.project_id,
            "auth_test.txt",
            "This should not be deletable without auth"
        )
        
        # Clear auth token
        original_token = test_instance.auth_token
        test_instance.auth_token = None
        
        # Try to delete without auth
        delete_payload = {
            "path": test_file,
            "is_folder": False,
            "recursive": False
        }
        
        async with await test_instance.delete(
            f"/api/projects/{test_instance.project_id}/files/delete",
            json=delete_payload
        ) as response:
            # Should fail with 401 or 403
            assert response.status in [401, 403], "Should require authentication"
        
        # Restore auth token
        test_instance.auth_token = original_token
        
        # Verify file still exists (wasn't deleted)
        file_still_exists = await test_instance.verify_file_exists(
            test_instance.project_id,
            test_file
        )
        assert file_still_exists, "File should still exist after failed auth attempt"
        
    finally:
        await test_instance.async_teardown()


# Add more API tests here as you develop new endpoints