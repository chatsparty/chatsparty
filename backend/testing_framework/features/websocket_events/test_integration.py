"""
Integration tests for WebSocket events - SYSTEMATIC DEBUGGING

This test suite systematically identifies where WebSocket events fail:
1. File watcher setup and monitoring
2. File operations triggering events  
3. WebSocket event generation
4. WebSocket event delivery
"""
import asyncio
import websockets
import json
import sys
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from testing_framework.test_base import FileTestBase


class WebSocketEventTester(FileTestBase):
    """Test WebSocket event firing for file operations"""
    
    def __init__(self):
        super().__init__()
        self.websocket_events = []
        self.websocket_connection = None
        
    async def connect_websocket(self):
        """Connect to WebSocket and start listening for events"""
        if not self.auth_token:
            raise ValueError("Must be authenticated before connecting to WebSocket")
            
        ws_url = f"ws://localhost:8000/ws?token={self.auth_token}"
        
        try:
            self.websocket_connection = await websockets.connect(ws_url)
            print(f"✅ Connected to WebSocket: {ws_url}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to WebSocket: {e}")
            return False
    
    async def listen_for_events(self, duration_seconds=5):
        """Listen for WebSocket events for specified duration"""
        if not self.websocket_connection:
            print("❌ No WebSocket connection")
            return
            
        print(f"👂 Listening for WebSocket events for {duration_seconds} seconds...")
        
        try:
            end_time = time.time() + duration_seconds
            
            while time.time() < end_time:
                try:
                    # Wait for message with timeout
                    message = await asyncio.wait_for(
                        self.websocket_connection.recv(), 
                        timeout=0.5
                    )
                    
                    try:
                        event_data = json.loads(message)
                        self.websocket_events.append(event_data)
                        print(f"📨 Received WebSocket event: {event_data}")
                    except json.JSONDecodeError:
                        print(f"📨 Received non-JSON message: {message}")
                        
                except asyncio.TimeoutError:
                    # No message received in timeout period - continue listening
                    continue
                    
        except Exception as e:
            print(f"❌ Error listening for events: {e}")
    
    async def close_websocket(self):
        """Close WebSocket connection"""
        if self.websocket_connection:
            await self.websocket_connection.close()
            self.websocket_connection = None
    
    async def async_teardown(self):
        """Clean up WebSocket and parent resources"""
        await self.close_websocket()
        await super().async_teardown()


async def test_websocket_connection_auth():
    """Test 1: Verify WebSocket connection with authentication works"""
    print("\n🧪 TEST 1: WebSocket Connection with Authentication")
    print("=" * 60)
    
    test = WebSocketEventTester()
    await test.async_setup()
    await test.login_as_test_user()
    
    try:
        # Test WebSocket connection
        connected = await test.connect_websocket()
        assert connected, "Should be able to connect to WebSocket with valid token"
        
        # Test basic communication
        if test.websocket_connection:
            # Listen briefly to ensure connection is stable
            await test.listen_for_events(2)
            print("✅ WebSocket connection and authentication working")
        
    finally:
        await test.async_teardown()


async def test_file_watcher_setup():
    """Test 2: Verify file watcher is properly set up for project"""
    print("\n🧪 TEST 2: File Watcher Setup")
    print("=" * 60)
    
    test = WebSocketEventTester()
    await test.async_setup()
    await test.login_as_test_user()
    
    try:
        # Create test project
        project = await test.create_test_project("WebSocket Test Project")
        project_id = project["id"]
        
        # Set up VM for project
        await test.setup_project_vm(project_id)
        
        # Check if file watcher exists for this project
        from app.services.vm.vm_factory import get_vm_service
        vm_service = get_vm_service()
        
        if hasattr(vm_service, 'file_observers'):
            if project_id in vm_service.file_observers:
                observer = vm_service.file_observers[project_id]
                print(f"✅ File watcher exists for project {project_id}")
                print(f"📊 Observer alive: {observer.is_alive()}")
                
                if not observer.is_alive():
                    print("⚠️ File watcher exists but is not alive!")
            else:
                print(f"❌ No file watcher found for project {project_id}")
                print("🔧 Available watchers:", list(vm_service.file_observers.keys()))
                
                # Try to start file watcher manually
                print("🔧 Attempting to start file watcher...")
                
                def test_callback(event_type: str, file_path: str, proj_id: str):
                    print(f"🎉 File watcher callback: {event_type} - {file_path} - {proj_id}")
                
                await vm_service.setup_file_watcher(project_id, test_callback)
                print("✅ File watcher started")
        else:
            print("❌ VM service doesn't have file_observers attribute")
            
    finally:
        await test.async_teardown()


async def test_file_delete_websocket_events():
    """Test 3: Comprehensive file deletion with WebSocket event monitoring"""
    print("\n🧪 TEST 3: File Delete + WebSocket Events (COMPREHENSIVE)")
    print("=" * 60)
    
    test = WebSocketEventTester()
    await test.async_setup()
    await test.login_as_test_user()
    
    try:
        # Create test project
        project = await test.create_test_project("Delete WebSocket Test")
        project_id = project["id"]
        
        # Set up VM
        await test.setup_project_vm(project_id)
        await asyncio.sleep(2)  # Give VM time to start
        
        # Connect to WebSocket
        connected = await test.connect_websocket()
        assert connected, "Must connect to WebSocket for event monitoring"
        
        # Start listening for events in background
        listen_task = asyncio.create_task(test.listen_for_events(10))
        
        # Wait a moment for WebSocket to be ready
        await asyncio.sleep(1)
        
        # Create test file
        print("📝 Creating test file...")
        test_file = await test.create_test_file_in_project(
            project_id,
            "websocket_delete_test.txt",
            "This file should trigger WebSocket events when deleted"
        )
        
        # Wait for potential file creation event
        await asyncio.sleep(2)
        
        print(f"📊 WebSocket events so far: {len(test.websocket_events)}")
        for event in test.websocket_events:
            print(f"  📨 {event}")
        
        # Verify file exists
        file_exists_before = await test.verify_file_exists(project_id, test_file)
        assert file_exists_before, "Test file should exist before deletion"
        print(f"✅ Test file exists: {test_file}")
        
        # Delete file via API (this should trigger WebSocket event)
        print("🗑️ Deleting file via API...")
        delete_payload = {
            "path": test_file,
            "is_folder": False,
            "recursive": False
        }
        
        async with await test.delete(
            f"/api/projects/{project_id}/files/delete",
            json=delete_payload
        ) as response:
            print(f"📊 Delete API status: {response.status}")
            assert response.status == 200, f"Delete API failed: {await response.text()}"
            
            data = await response.json()
            print(f"📊 Delete API response: {data}")
            assert data.get("success") == True, "API should report success"
        
        # Wait for WebSocket events to arrive
        print("⏱️ Waiting for WebSocket events...")
        await asyncio.sleep(3)
        
        # Stop listening
        listen_task.cancel()
        try:
            await listen_task
        except asyncio.CancelledError:
            pass
        
        # Verify file was actually deleted
        file_exists_after = await test.verify_file_exists(project_id, test_file)
        print(f"📊 File exists after deletion: {file_exists_after}")
        assert not file_exists_after, "File should be actually deleted"
        
        # Analyze WebSocket events
        print("\n📊 WEBSOCKET EVENT ANALYSIS:")
        print("=" * 40)
        print(f"Total events received: {len(test.websocket_events)}")
        
        if test.websocket_events:
            for i, event in enumerate(test.websocket_events):
                print(f"Event {i+1}: {event}")
        else:
            print("❌ NO WEBSOCKET EVENTS RECEIVED!")
            print("🐛 This confirms the bug: file deletion works but events don't fire")
        
        # Look for delete-related events
        delete_events = [
            event for event in test.websocket_events 
            if any(keyword in str(event).lower() for keyword in ['delete', 'removed', 'fs:deleted'])
        ]
        
        print(f"\nDelete-related events: {len(delete_events)}")
        for event in delete_events:
            print(f"  🗑️ {event}")
        
        if len(delete_events) == 0:
            print("🐛 BUG CONFIRMED: No delete events fired despite successful deletion")
            print("🔍 Issue is in the file watcher → WebSocket event chain")
            return False
        else:
            print("✅ Delete events are working correctly")
            return True
            
    finally:
        await test.async_teardown()


async def test_file_watcher_callback_execution():
    """Test 4: Verify file watcher callback is actually called"""
    print("\n🧪 TEST 4: File Watcher Callback Execution")
    print("=" * 60)
    
    test = WebSocketEventTester()
    await test.async_setup()
    await test.login_as_test_user()
    
    try:
        # Create test project
        project = await test.create_test_project("Callback Test Project")
        project_id = project["id"]
        await test.setup_project_vm(project_id)
        
        # Set up file watcher with custom callback
        callback_events = []
        
        def test_callback(event_type: str, file_path: str, proj_id: str):
            callback_events.append({
                "type": event_type,
                "path": file_path,
                "project_id": proj_id,
                "timestamp": time.time()
            })
            print(f"🎯 CALLBACK TRIGGERED: {event_type} - {file_path}")
        
        from app.services.vm.vm_factory import get_vm_service
        vm_service = get_vm_service()
        
        print("🔧 Setting up file watcher with custom callback...")
        await vm_service.setup_file_watcher(project_id, test_callback)
        
        # Create a test file
        print("📝 Creating test file to trigger watcher...")
        test_file = await test.create_test_file_in_project(
            project_id,
            "callback_test.txt",
            "Callback test content"
        )
        
        # Wait for file creation event
        await asyncio.sleep(2)
        
        print(f"📊 Callback events after creation: {len(callback_events)}")
        for event in callback_events:
            print(f"  📨 {event}")
        
        # Delete the file using VM service directly
        print("🗑️ Deleting file using VM service...")
        delete_success = await vm_service.delete_file(project_id, test_file)
        print(f"📊 VM delete result: {delete_success}")
        
        # Wait for file deletion event
        await asyncio.sleep(2)
        
        print(f"📊 Callback events after deletion: {len(callback_events)}")
        for event in callback_events:
            print(f"  📨 {event}")
        
        # Check for delete events
        delete_callback_events = [
            event for event in callback_events 
            if 'delete' in event.get('type', '').lower() or 'removed' in event.get('type', '').lower()
        ]
        
        if len(delete_callback_events) == 0:
            print("🐛 BUG FOUND: File watcher callback not triggered for deletions")
            print("🔍 Issue is in the file watcher implementation itself")
            return False
        else:
            print("✅ File watcher callback working for deletions")
            return True
            
    finally:
        await test.async_teardown()


async def test_manual_file_operations():
    """Test 5: Manual file operations to trigger file watcher"""
    print("\n🧪 TEST 5: Manual File Operations")
    print("=" * 60)
    
    test = WebSocketEventTester()
    await test.async_setup()
    await test.login_as_test_user()
    
    try:
        # Create test project
        project = await test.create_test_project("Manual Test Project")
        project_id = project["id"]
        await test.setup_project_vm(project_id)
        
        # Set up file watcher
        callback_events = []
        
        def manual_callback(event_type: str, file_path: str, proj_id: str):
            callback_events.append({
                "type": event_type,
                "path": file_path,
                "project_id": proj_id
            })
            print(f"🎯 MANUAL CALLBACK: {event_type} - {file_path}")
        
        from app.services.vm.vm_factory import get_vm_service
        vm_service = get_vm_service()
        await vm_service.setup_file_watcher(project_id, manual_callback)
        
        # Manual file operations using direct commands
        print("📝 Creating file manually via command...")
        await vm_service.execute_command(
            project_id,
            "echo 'Manual test' > /workspace/manual_test.txt"
        )
        
        await asyncio.sleep(2)
        print(f"📊 Events after manual creation: {len(callback_events)}")
        
        print("🗑️ Deleting file manually via command...")
        await vm_service.execute_command(
            project_id,
            "rm -f /workspace/manual_test.txt"
        )
        
        await asyncio.sleep(2)
        print(f"📊 Events after manual deletion: {len(callback_events)}")
        
        for event in callback_events:
            print(f"  📨 {event}")
        
        return len(callback_events) > 0
        
    finally:
        await test.async_teardown()


# Main test runner for WebSocket event debugging
async def run_websocket_debug_tests():
    """Run all WebSocket debugging tests systematically"""
    print("🔬 WEBSOCKET EVENT DEBUGGING - SYSTEMATIC ANALYSIS")
    print("=" * 80)
    
    results = {}
    
    # Test 1: WebSocket Connection
    try:
        await test_websocket_connection_auth()
        results["websocket_auth"] = True
    except Exception as e:
        print(f"❌ WebSocket auth test failed: {e}")
        results["websocket_auth"] = False
    
    # Test 2: File Watcher Setup
    try:
        await test_file_watcher_setup()
        results["file_watcher_setup"] = True
    except Exception as e:
        print(f"❌ File watcher setup test failed: {e}")
        results["file_watcher_setup"] = False
    
    # Test 3: Complete workflow
    try:
        workflow_success = await test_file_delete_websocket_events()
        results["complete_workflow"] = workflow_success
    except Exception as e:
        print(f"❌ Complete workflow test failed: {e}")
        results["complete_workflow"] = False
    
    # Test 4: Callback execution
    try:
        callback_success = await test_file_watcher_callback_execution()
        results["callback_execution"] = callback_success
    except Exception as e:
        print(f"❌ Callback execution test failed: {e}")
        results["callback_execution"] = False
    
    # Test 5: Manual operations
    try:
        manual_success = await test_manual_file_operations()
        results["manual_operations"] = manual_success
    except Exception as e:
        print(f"❌ Manual operations test failed: {e}")
        results["manual_operations"] = False
    
    # Analysis
    print("\n" + "=" * 80)
    print("🔍 DIAGNOSTIC RESULTS")
    print("=" * 80)
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:25}: {status}")
    
    # Provide diagnosis
    print("\n🩺 DIAGNOSIS:")
    if not results.get("websocket_auth", False):
        print("❌ WebSocket authentication is broken")
    elif not results.get("file_watcher_setup", False):
        print("❌ File watcher setup is broken")
    elif not results.get("callback_execution", False):
        print("❌ File watcher callbacks are not being executed")
    elif not results.get("complete_workflow", False):
        print("❌ File watcher → WebSocket event chain is broken")
    else:
        print("✅ All components working - issue might be timing or edge case")
    
    return results


# Standalone test function for the framework
async def test_websocket_event_integration():
    """Main integration test for WebSocket events"""
    return await run_websocket_debug_tests()


if __name__ == "__main__":
    # Run as standalone script
    asyncio.run(run_websocket_debug_tests())