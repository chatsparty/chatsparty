import asyncio
import logging
from datetime import datetime
from typing import Optional

from ...project.domain.entities import VMCommandResult
from .container_manager import ContainerManager

logger = logging.getLogger(__name__)


class DockerCommandExecutor:
    """Implementation of command execution for Docker containers"""

    def __init__(self, container_manager: ContainerManager):
        self.container_manager = container_manager
        self.default_timeout = 30

    async def execute_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in project container"""
        container = self.container_manager.get_container(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        work_dir = working_dir or "/workspace"
        cmd_timeout = timeout or self.default_timeout

        try:
            start_time = datetime.now()

            logger.info(f"[VM] Executing command in project {project_id}: {command}")
            logger.info(f"[VM] Working directory: {work_dir}, Timeout: {cmd_timeout}s")

            # Execute command in container using thread pool
            def _exec_command():
                return container.exec_run(
                    f"cd {work_dir} && {command}",
                    user="root",
                    workdir=work_dir,
                    environment={"HOME": "/workspace"},
                    demux=True  # Separate stdout and stderr
                )
            
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.container_manager.executor, 
                _exec_command
            )

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()

            # Handle demuxed output
            if isinstance(result.output, tuple):
                stdout_bytes, stderr_bytes = result.output
                stdout = stdout_bytes.decode() if stdout_bytes else ""
                stderr = stderr_bytes.decode() if stderr_bytes else ""
            else:
                # Non-demuxed output (mixed stdout/stderr)
                stdout = result.output.decode() if result.output else ""
                stderr = ""

            cmd_result = VMCommandResult(
                stdout=stdout,
                stderr=stderr,
                exit_code=result.exit_code,
                execution_time=execution_time
            )
            
            if result.exit_code == 0:
                logger.info(f"[VM] ✅ Command succeeded in {execution_time:.2f}s")
                if stdout:
                    logger.info(f"[VM] Output: {stdout[:200]}{'...' if len(stdout) > 200 else ''}")
            else:
                logger.warning(f"[VM] ❌ Command failed with exit code {result.exit_code} in {execution_time:.2f}s")
                if stderr:
                    logger.warning(f"[VM] Error: {stderr[:200]}{'...' if len(stderr) > 200 else ''}")
            
            return cmd_result

        except Exception as e:
            logger.error(f"[VM] ❌ Command execution exception: {str(e)}")
            return VMCommandResult(
                stdout="",
                stderr=f"Command execution failed: {str(e)}",
                exit_code=1,
                execution_time=0
            )

    async def install_package(
        self,
        project_id: str,
        package: str,
        package_manager: str = "apt"
    ) -> VMCommandResult:
        """Install software packages in the container"""
        logger.info(f"[VM] Installing package '{package}' using {package_manager} in project {project_id}")
        commands = {
            "apt": f"apt-get update && apt-get install -y {package}",
            "pip": f"pip3 install {package}",
            "pip3": f"pip3 install {package}",
            "npm": f"npm install -g {package}",
            "yarn": f"yarn global add {package}",
        }

        command = commands.get(package_manager)
        if not command:
            logger.error(f"[VM] ❌ Unsupported package manager: {package_manager}")
            return VMCommandResult(
                stdout="",
                stderr=f"Unsupported package manager: {package_manager}",
                exit_code=1,
                execution_time=0
            )

        # 5 minute timeout for installs
        logger.info(f"[VM] Running package installation with 5-minute timeout")
        result = await self.execute_command(project_id, command, timeout=300)
        
        if result.exit_code == 0:
            logger.info(f"[VM] ✅ Package '{package}' installed successfully")
        else:
            logger.error(f"[VM] ❌ Package '{package}' installation failed")
        
        return result