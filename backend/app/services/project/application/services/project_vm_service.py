"""
Project VM workspace management service
"""

import asyncio
import logging
from typing import Any, Dict, Optional

# MCP integration removed - ProjectVMTools functionality disabled
class ProjectVMTools:
    def __init__(self, *args, **kwargs):
        pass
from ...domain.entities import Project
from .base import BaseProjectService

logger = logging.getLogger(__name__)


class ProjectVMService(BaseProjectService):
    """
    VM workspace management for projects
    Handles VM creation, destruction, and tool access
    """

    async def setup_vm_workspace(self, project_id: str) -> Dict[str, Any]:
        """
        🖥️ Set up complete VM workspace for the project
        
        This creates a full Linux environment where agents can:
        - Install any software they need
        - Run development servers
        - Execute complex workflows
        - Access all project files
        """
        logger.info(f"[PROJECT_VM_SERVICE] 🚀 Starting VM workspace setup for project: {project_id}")
        logger.info(f"[PROJECT_VM_SERVICE] VM provider: {type(self.vm_service).__name__}")

        try:
            logger.info(f"[PROJECT_VM_SERVICE] 📝 Updating project {project_id} status to 'starting'")
            self.project_repo.update_vm_status(project_id, "starting")
            logger.info(f"[PROJECT_VM_SERVICE] ✅ Project status updated to 'starting'")

            logger.info(f"[PROJECT_VM_SERVICE] 🔧 Creating VM sandbox for project {project_id}")
            vm_info = await asyncio.wait_for(
                self.vm_service.create_project_sandbox(project_id),
                timeout=120
            )
            logger.info(f"[PROJECT_VM_SERVICE] ✅ VM sandbox created successfully: {vm_info}")

            logger.info(f"[PROJECT_VM_SERVICE] 📝 Updating project {project_id} status to 'active'")
            update_success = self.project_repo.update_vm_info_detailed(
                project_id=project_id,
                sandbox_id=vm_info["sandbox_id"],
                vm_status="active",
                vm_configuration=vm_info
            )
            
            if update_success:
                logger.info(f"[PROJECT_VM_SERVICE] ✅ Project {project_id} status updated to 'active'")
                logger.info(f"[PROJECT_VM_SERVICE] 📋 Sandbox ID: {vm_info['sandbox_id']}")
                
                updated_project = self.project_repo.get_by_id_only(project_id)
                if updated_project:
                    logger.info(f"[PROJECT_VM_SERVICE] 🔍 Verified project status: {updated_project.vm_status}")
                    logger.info(f"[PROJECT_VM_SERVICE] 🔍 Verified container ID: {updated_project.vm_container_id}")
                else:
                    logger.error(f"[PROJECT_VM_SERVICE] ❌ Could not verify project update")
            else:
                logger.error(f"[PROJECT_VM_SERVICE] ❌ Failed to update project status to 'active'")

            logger.info(f"[PROJECT_VM_SERVICE] 🔧 Creating VM tools for project {project_id}")
            self.active_vm_tools[project_id] = ProjectVMTools(
                self.vm_service,
                project_id
            )
            logger.info(f"[PROJECT_VM_SERVICE] ✅ VM tools created successfully for project {project_id}")
            logger.info(f"[PROJECT_VM_SERVICE] 📊 Active VM tools count: {len(self.active_vm_tools)}")

            logger.info(f"[PROJECT_VM_SERVICE] 🎉 ✅ VM workspace ready for project: {project_id}")
            logger.info(f"[PROJECT_VM_SERVICE] 🔗 VM URL: {vm_info.get('vm_url', 'N/A')}")
            logger.info(f"[PROJECT_VM_SERVICE] 📂 Workspace path: {vm_info.get('workspace_path', '/workspace')}")
            return vm_info

        except asyncio.TimeoutError:
            logger.error(f"[PROJECT_VM_SERVICE] ⏰ ❌ Timeout creating VM workspace for {project_id} (120s limit)")
            self.project_repo.update_vm_status(project_id, "error")
            raise Exception("VM creation timed out")
        except Exception as e:
            logger.error(f"[PROJECT_VM_SERVICE] ❌ Failed to setup VM workspace for {project_id}: {str(e)}")
            logger.error(f"[PROJECT_VM_SERVICE] Error type: {type(e).__name__}")
            self.project_repo.update_vm_status(project_id, "error")
            raise

    async def cleanup_vm_workspace(self, project_id: str) -> bool:
        """🧹 Clean up VM workspace and stop all services"""
        try:
            services = []

            await self.vm_service.destroy_project_sandbox(project_id)

            self.project_repo.update_vm_status(project_id, "stopped")

            if project_id in self.active_vm_tools:
                del self.active_vm_tools[project_id]

            return True

        except Exception as e:
            logger.error(f"Error cleaning up VM workspace for {project_id}: {str(e)}")
            return False

    async def get_vm_tools_for_project(self, project_id: str) -> ProjectVMTools:
        """
        🔧 Get MCP tools that give agents FULL computer access
        
        These tools allow agents to:
        - Execute any shell command with full privileges
        - Install software packages 
        - Manage files and directories
        - Start web servers and services
        - Access databases and APIs
        - Everything a developer can do!
        """
        logger.info(f"[PROJECT_VM_SERVICE] 🔍 Looking for VM tools for project {project_id}")
        logger.info(f"[PROJECT_VM_SERVICE] 📋 Available VM tools: {list(self.active_vm_tools.keys())}")
        logger.info(f"[PROJECT_VM_SERVICE] 📊 Total active VM tools: {len(self.active_vm_tools)}")
        
        vm_tools = self.active_vm_tools.get(project_id)
        if not vm_tools:
            logger.warning(f"[PROJECT_VM_SERVICE] ⚠️ No VM tools found for project {project_id}. Attempting to create them.")
            project = self.project_repo.get_by_id_only(project_id)
            logger.info(f"[PROJECT_VM_SERVICE] 📋 Project {project_id} details: vm_status={project.vm_status if project else 'None'}, container_id={project.vm_container_id if project else 'None'}")
            if project and project.vm_status == "active":
                if project.vm_container_id:
                    logger.info(f"[PROJECT_VM_SERVICE] 🔄 Project {project_id} has active VM status, attempting to reconnect to container {project.vm_container_id}")
                    try:
                        reconnected = await self.vm_service.reconnect_to_sandbox(project_id, project.vm_container_id)
                        if reconnected:
                            logger.info(f"[PROJECT_VM_SERVICE] ✅ Successfully reconnected to container {project.vm_container_id}")
                            self.active_vm_tools[project_id] = ProjectVMTools(
                                self.vm_service,
                                project_id
                            )
                            vm_tools = self.active_vm_tools[project_id]
                            logger.info(f"[PROJECT_VM_SERVICE] ✅ Successfully created VM tools for project {project_id}")
                        else:
                            logger.error(f"[PROJECT_VM_SERVICE] ❌ Failed to reconnect to container {project.vm_container_id}")
                            logger.info(f"[PROJECT_VM_SERVICE] 🔄 Attempting to create new sandbox for project {project_id}")
                            vm_tools = await self._create_new_sandbox_and_tools(project_id)
                    except Exception as e:
                        logger.error(f"[PROJECT_VM_SERVICE] ❌ Failed to reconnect and create VM tools for project {project_id}: {e}")
                        logger.info(f"[PROJECT_VM_SERVICE] 🔄 Attempting to create new sandbox for project {project_id}")
                        vm_tools = await self._create_new_sandbox_and_tools(project_id)
                else:
                    logger.warning(f"[PROJECT_VM_SERVICE] ⚠️ Project {project_id} has active VM status but no sandbox_id - creating new sandbox")
                    vm_tools = await self._create_new_sandbox_and_tools(project_id)
            else:
                logger.warning(f"[PROJECT_VM_SERVICE] ⚠️ Project {project_id} VM not active (status: {project.vm_status if project else 'not found'}, project exists: {project is not None})")
        
        if not vm_tools:
            logger.error(f"[PROJECT_VM_SERVICE] ❌ No VM tools available for project: {project_id}")
            raise ValueError(f"No VM tools available for project: {project_id}")
        
        logger.info(f"[PROJECT_VM_SERVICE] ✅ VM tools retrieved successfully for project {project_id}")
        return vm_tools

    async def _create_new_sandbox_and_tools(self, project_id: str) -> Optional[ProjectVMTools]:
        """Create a new sandbox and VM tools for a project"""
        try:
            logger.info(f"Creating new VM sandbox for project {project_id}")
            
            vm_info = await self.vm_service.create_project_sandbox(
                project_id=project_id,
                environment_type="full"
            )
            
            logger.info(f"New VM sandbox created: {vm_info}")
            
            self.project_repo.update_vm_info_detailed(
                project_id=project_id,
                sandbox_id=vm_info["sandbox_id"],
                vm_status="active",
                vm_configuration=vm_info
            )
            
            self.active_vm_tools[project_id] = ProjectVMTools(
                self.vm_service,
                project_id
            )
            
            vm_tools = self.active_vm_tools[project_id]
            logger.info(f"Successfully created new sandbox and VM tools for project {project_id}")
            return vm_tools
            
        except Exception as e:
            logger.error(f"Failed to create new sandbox for project {project_id}: {e}")
            return None

    async def execute_agent_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute command in project VM on behalf of an agent"""
        logger.info(f"[PROJECT_VM_SERVICE] 🤖 Agent command execution requested")
        logger.info(f"[PROJECT_VM_SERVICE] 📋 Project ID: {project_id}")
        logger.info(f"[PROJECT_VM_SERVICE] 🔨 Command: {command}")
        logger.info(f"[PROJECT_VM_SERVICE] 📂 Working directory: {working_dir or '/workspace (default)'}")
        
        try:
            vm_tools = await self.get_vm_tools_for_project(project_id)
            if not vm_tools:
                logger.error(f"[PROJECT_VM_SERVICE] ❌ No VM tools available for project {project_id}")
                return {
                    'success': False,
                    'error': 'No VM tools available',
                    'exit_code': 1,
                    'stdout': '',
                    'stderr': 'VM tools not available'
                }
                
            logger.info(f"[PROJECT_VM_SERVICE] ✅ VM tools found, executing command...")
            result = await vm_tools.execute_command(command, working_dir)
            
            if result.get('success'):
                logger.info(f"[PROJECT_VM_SERVICE] ✅ Agent command executed successfully")
                logger.info(f"[PROJECT_VM_SERVICE] 📊 Exit code: {result.get('exit_code', 'N/A')}")
                if result.get('stdout'):
                    logger.info(f"[PROJECT_VM_SERVICE] 📤 Output: {result.get('stdout', '')[:200]}{'...' if len(result.get('stdout', '')) > 200 else ''}")
            else:
                logger.error(f"[PROJECT_VM_SERVICE] ❌ Agent command failed")
                logger.error(f"[PROJECT_VM_SERVICE] 📊 Exit code: {result.get('exit_code', 'N/A')}")
                logger.error(f"[PROJECT_VM_SERVICE] 🚨 Error: {result.get('stderr', 'Unknown error')}")
                logger.error(f"[PROJECT_VM_SERVICE] 📤 STDOUT: {result.get('stdout', 'No output')}")
            
            return result
            
        except Exception as e:
            logger.error(f"[PROJECT_VM_SERVICE] ❌ Exception during agent command execution: {e}")
            return {
                'success': False,
                'error': str(e),
                'exit_code': 1,
                'stdout': '',
                'stderr': f'Exception: {str(e)}'
            }