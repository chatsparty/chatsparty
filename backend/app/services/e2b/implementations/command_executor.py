import asyncio
import logging
from datetime import datetime
from typing import Optional

from ...project.domain.entities import VMCommandResult
from ..interfaces.command_executor import ICommandExecutor
from .sandbox_manager import SandboxManager

logger = logging.getLogger(__name__)


class CommandExecutor(ICommandExecutor):
    """Implementation of command execution for E2B sandboxes"""

    def __init__(self, sandbox_manager: SandboxManager):
        self.sandbox_manager = sandbox_manager
        self.default_timeout = 30

    async def execute_command(
        self,
        project_id: str,
        command: str,
        working_dir: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> VMCommandResult:
        """
        Execute command in project VM with full system access

        This gives agents complete control over the VM environment
        """
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            # Try to reconnect if we have sandbox info
            logger.warning(
                f"No active sandbox for project {project_id}, "
                f"attempting to reconnect..."
            )
            raise ValueError(f"No active sandbox for project {project_id}")

        work_dir = working_dir or f"/workspace/{project_id}"
        cmd_timeout = timeout or self.default_timeout

        try:
            start_time = datetime.now()

            logger.info(f"Executing command: {command} in {work_dir}")

            # Execute command using subprocess within the sandbox
            result = sandbox.run_code(f"""
import subprocess
import os

# Change to working directory
os.chdir('{work_dir}')

# Execute the command
try:
    result = subprocess.run('{command}', shell=True,
                          capture_output=True, text=True)
    print(f"STDOUT: {{result.stdout}}")
    print(f"STDERR: {{result.stderr}}")
    print(f"EXIT_CODE: {{result.returncode}}")
except Exception as e:
    print(f"ERROR: {{str(e)}}")
    print("EXIT_CODE: 1")
""")

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()

            # Parse the result output - handle None case
            if result is None:
                logger.warning(f"Command execution returned None: {command}")
                stdout = ""
                stderr = "Command execution returned None"
                exit_code = 1
            else:
                output = ""
                if hasattr(result, 'text') and result.text:
                    output = result.text
                else:
                    output = str(result) if result else ""

                stdout = ""
                stderr = ""
                exit_code = 0

                # Extract stdout, stderr, and exit code from the output
                for line in output.split('\n'):
                    if line.startswith('STDOUT: '):
                        stdout = line[8:]
                    elif line.startswith('STDERR: '):
                        stderr = line[8:]
                    elif line.startswith('EXIT_CODE: '):
                        try:
                            exit_code = int(line[11:])
                        except ValueError:
                            exit_code = 1

            return VMCommandResult(
                stdout=stdout,
                stderr=stderr,
                exit_code=exit_code,
                execution_time=execution_time
            )

        except asyncio.TimeoutError:
            return VMCommandResult(
                stdout="",
                stderr=f"Command timed out after {cmd_timeout} seconds",
                exit_code=124,  # Standard timeout exit code
                execution_time=cmd_timeout
            )
        except Exception as e:
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
        """Install software packages in the VM"""
        commands = {
            "apt": f"sudo apt-get update && sudo apt-get install -y {package}",
            "pip": f"pip3 install {package}",
            "pip3": f"pip3 install {package}",
            "npm": f"npm install -g {package}",
            "yarn": f"yarn global add {package}",
            "conda": f"conda install -y {package}"
        }

        command = commands.get(package_manager)
        if not command:
            return VMCommandResult(
                stdout="",
                stderr=f"Unsupported package manager: {package_manager}",
                exit_code=1,
                execution_time=0
            )

        # 5 minute timeout for installs
        return await self.execute_command(project_id, command, timeout=300)
