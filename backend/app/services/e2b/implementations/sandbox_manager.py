import logging
import os
from datetime import datetime
from typing import Dict, Optional

from e2b_code_interpreter import Sandbox

from ..domain.models import SandboxInfo, SandboxSystemInfo
from ..interfaces.sandbox_manager import ISandboxManager

logger = logging.getLogger(__name__)


class SandboxManager(ISandboxManager):
    """Implementation of sandbox management for E2B"""

    def __init__(self):
        self.active_sandboxes: Dict[str, Sandbox] = {}
        self.api_key = os.getenv('E2B_API_KEY')

        if not self.api_key:
            logger.warning(
                "E2B_API_KEY not set. VM features will be disabled."
            )

    async def create_project_sandbox(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> SandboxInfo:
        """Create a new E2B sandbox for a project with full computer access"""
        try:
            if not self.api_key:
                raise ValueError("E2B API key not configured")

            logger.info(f"Creating E2B sandbox for project {project_id}...")

            # Create actual E2B Code Interpreter
            sandbox = Sandbox(
                api_key=self.api_key,
                timeout=60  # 60 second timeout for creation
            )

            workspace_path = f"/workspace/{project_id}"

            # Store the actual sandbox instance
            self.active_sandboxes[project_id] = sandbox

            logger.info(f"E2B sandbox created with ID: {sandbox.sandbox_id}")

            # Create workspace directory using run_code
            try:
                result = sandbox.run_code(
                    f"import os; os.makedirs('{workspace_path}', "
                    f"exist_ok=True); print('Workspace created')"
                )
                if result and hasattr(result, 'text') and result.text:
                    logger.info(f"Workspace creation result: {result.text}")
                elif result:
                    logger.info(f"Workspace creation result: {result}")
                else:
                    logger.info("Workspace creation completed (no output)")
            except Exception as e:
                logger.warning(f"Failed to create workspace directory: {e}")

            return SandboxInfo(
                sandbox_id=sandbox.sandbox_id,
                status="active",
                workspace_path=workspace_path,
                environment_type=environment_type,
                vm_url=f"https://{sandbox.sandbox_id}.e2b.dev",
                created_at=datetime.now().isoformat()
            )

        except Exception as e:
            logger.error(
                f"Failed to create E2B sandbox for project {project_id}: {e}"
            )
            # Clean up if sandbox was partially created
            if project_id in self.active_sandboxes:
                try:
                    del self.active_sandboxes[project_id]
                except Exception:
                    pass
            raise

    async def reconnect_to_sandbox(
        self,
        project_id: str,
        sandbox_id: str
    ) -> bool:
        """Reconnect to an existing E2B sandbox"""
        try:
            if not self.api_key:
                raise ValueError("E2B API key not configured")

            logger.info(
                f"Reconnecting to E2B sandbox {sandbox_id} "
                f"for project {project_id}"
            )

            # Try to connect to existing sandbox
            try:
                # Method 1: Try Sandbox.connect
                sandbox = Sandbox.connect(sandbox_id, api_key=self.api_key)
            except Exception as e1:
                logger.warning(
                    f"Sandbox.connect failed: {e1}, trying alternative method"
                )
                try:
                    # Method 2: Try creating with existing ID
                    sandbox = Sandbox(
                        api_key=self.api_key,
                        sandbox_id=sandbox_id
                    )
                except Exception as e2:
                    logger.error(
                        f"Alternative reconnection method failed: {e2}"
                    )
                    return False

            # Test if sandbox is responsive
            try:
                test_result = sandbox.run_code("print('test')")
                logger.info(f"Sandbox connection test: {test_result}")
            except Exception as e:
                logger.warning(f"Sandbox test failed but continuing: {e}")

            # Store the reconnected sandbox
            self.active_sandboxes[project_id] = sandbox

            logger.info(f"Successfully reconnected to sandbox {sandbox_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to reconnect to sandbox {sandbox_id}: {e}")
            return False

    async def get_or_reconnect_sandbox(
        self,
        project_id: str,
        sandbox_id: Optional[str] = None
    ) -> bool:
        """Get existing sandbox or attempt to reconnect"""
        # If sandbox is already in memory, return it
        if project_id in self.active_sandboxes:
            return True

        # If we have a sandbox_id, try to reconnect
        if sandbox_id:
            return await self.reconnect_to_sandbox(project_id, sandbox_id)

        return False

    def destroy_sandbox(self, project_id: str) -> bool:
        """Destroy a sandbox and clean up resources"""
        try:
            if project_id in self.active_sandboxes:
                # Remove from active sandboxes
                del self.active_sandboxes[project_id]

                logger.info(f"Destroyed sandbox for project {project_id}")
                return True
            else:
                logger.warning(
                    f"No active sandbox found for project {project_id}"
                )
                return False

        except Exception as e:
            logger.error(
                f"Failed to destroy sandbox for project {project_id}: {e}"
            )
            return False

    def is_sandbox_active(self, project_id: str) -> bool:
        """Check if sandbox is active for project"""
        return project_id in self.active_sandboxes

    async def get_sandbox_info(
        self,
        project_id: str
    ) -> Optional[SandboxSystemInfo]:
        """Get information about the project's sandbox"""
        if project_id not in self.active_sandboxes:
            return None

        sandbox = self.active_sandboxes[project_id]

        try:
            # Get system information using run_code instead of commands
            cpu_result = sandbox.run_code(
                "import subprocess; "
                "print(subprocess.run(['nproc'], "
                "capture_output=True, text=True).stdout.strip())"
            )
            memory_result = sandbox.run_code(
                "import subprocess; "
                "print(subprocess.run(['free', '-h'], "
                "capture_output=True, text=True).stdout)"
            )
            disk_result = sandbox.run_code(
                "import subprocess; "
                "print(subprocess.run(['df', '-h', '/'], "
                "capture_output=True, text=True).stdout)"
            )
            uptime_result = sandbox.run_code(
                "import subprocess; "
                "print(subprocess.run(['uptime'], "
                "capture_output=True, text=True).stdout.strip())"
            )

            return SandboxSystemInfo(
                sandbox_id=sandbox.sandbox_id,
                hostname=f"{sandbox.sandbox_id}.e2b.dev",
                cpu_cores=(
                    cpu_result.text or "unknown"
                    if cpu_result and hasattr(cpu_result, 'text')
                    else "unknown"
                ),
                memory_info=(
                    memory_result.text or "unknown"
                    if memory_result and hasattr(memory_result, 'text')
                    else "unknown"
                ),
                disk_info=(
                    disk_result.text or "unknown"
                    if disk_result and hasattr(disk_result, 'text')
                    else "unknown"
                ),
                uptime=(
                    uptime_result.text or "unknown"
                    if uptime_result and hasattr(uptime_result, 'text')
                    else "unknown"
                ),
                workspace_path=f"/workspace/{project_id}"
            )

        except Exception as e:
            logger.error(f"Failed to get sandbox info: {e}")
            return None

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate sandbox"""
        if project_id not in self.active_sandboxes:
            return True

        try:
            # E2B code interpreter sandboxes are automatically cleaned up
            del self.active_sandboxes[project_id]
            logger.info(f"Cleaned up sandbox for project {project_id}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to cleanup sandbox for project {project_id}: {e}"
            )
            return False

    def get_sandbox(self, project_id: str) -> Optional[Sandbox]:
        """Get the sandbox instance for a project"""
        return self.active_sandboxes.get(project_id)
