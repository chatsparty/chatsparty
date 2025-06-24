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
        
    async def _exec_command(self, container, cmd, **kwargs):
        """Helper method to execute commands in aiodocker container"""
        try:
            exec_obj = await container.exec(cmd, **kwargs)
            stream = exec_obj.start(detach=False)
            
            output_chunks = []
            async with stream:
                while True:
                    try:
                        msg = await asyncio.wait_for(stream.read_out(), timeout=5.0)
                        if msg is None:
                            break
                        if hasattr(msg, 'data'):
                            output_chunks.append(msg.data)
                        else:
                            output_chunks.append(msg)
                    except asyncio.TimeoutError:
                        logger.warning(f"Timeout reading stream for command: {cmd}")
                        break
            
            output_bytes = b"".join(output_chunks)
            
            inspect_result = await exec_obj.inspect()
            exit_code = inspect_result.get("ExitCode", 0)
            
            class ExecResult:
                def __init__(self, output, exit_code):
                    self.output = output
                    self.exit_code = exit_code
                    
            return ExecResult(output_bytes, exit_code)
        except Exception as e:
            logger.error(f"Error executing command {cmd}: {e}")
            class ExecResult:
                def __init__(self, output, exit_code):
                    self.output = output
                    self.exit_code = exit_code
                    
            return ExecResult(b"", 1)

    async def execute_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """Execute command in project container"""
        container = await self.container_manager.ensure_container_running(project_id)
        if not container:
            raise ValueError(f"No active container for project {project_id}")

        work_dir = working_dir or "/workspace"
        cmd_timeout = timeout or self.default_timeout

        try:
            start_time = datetime.now()

            full_command = f"cd {work_dir} && {command}"
            logger.info(f"[VM] 🚀 Executing command in project {project_id}")
            logger.info(f"[VM] 📋 Container ID: {container.id[:12]}")
            logger.info(f"[VM] 📂 Working directory: {work_dir}")
            logger.info(f"[VM] ⏱️ Timeout: {cmd_timeout}s")
            logger.info(f"[VM] 🔨 Full command: {full_command}")

            result = await asyncio.wait_for(
                self._exec_command(
                    container, ["bash", "-c", full_command],
                    user="root",
                    workdir=work_dir,
                    environment={"HOME": "/workspace", "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"}
                ),
                timeout=cmd_timeout
            )

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()

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
                    logger.info(f"[VM] 📤 STDOUT: {stdout[:500]}{'...' if len(stdout) > 500 else ''}")
                if stderr:
                    logger.info(f"[VM] 📤 STDERR: {stderr[:500]}{'...' if len(stderr) > 500 else ''}")
            else:
                logger.error(f"[VM] ❌ Command failed with exit code {result.exit_code} in {execution_time:.2f}s")
                logger.error(f"[VM] 🔍 Failed command: {full_command}")
                if stdout:
                    logger.error(f"[VM] 📤 STDOUT: {stdout[:500]}{'...' if len(stdout) > 500 else ''}")
                if stderr:
                    logger.error(f"[VM] 📤 STDERR: {stderr[:500]}{'...' if len(stderr) > 500 else ''}")
                else:
                    logger.error(f"[VM] 🚨 No error output - likely 'command not found' (exit 127)")
                
                if result.exit_code == 127:
                    logger.error(f"[VM] 💡 Exit code 127 usually means 'command not found'")
                    logger.error(f"[VM] 💡 Check if the command exists in the container PATH")
                    logger.error(f"[VM] 🔍 Attempting to debug container environment...")
            
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

        logger.info(f"[VM] Running package installation with 5-minute timeout")
        result = await self.execute_command(project_id, command, timeout=300)
        
        if result.exit_code == 0:
            logger.info(f"[VM] ✅ Package '{package}' installed successfully")
        else:
            logger.error(f"[VM] ❌ Package '{package}' installation failed")
        
        return result