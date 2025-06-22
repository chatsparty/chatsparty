import logging
from typing import Any, Dict

from ..domain.models import ServiceInfo
from ..interfaces.service_manager import IServiceManager
from .sandbox_manager import SandboxManager

logger = logging.getLogger(__name__)


class ServiceManager(IServiceManager):
    """Implementation of service management for E2B sandboxes"""

    def __init__(self, sandbox_manager: SandboxManager):
        self.sandbox_manager = sandbox_manager

    async def start_service(
        self,
        project_id: str,
        service_config: Dict[str, Any]
    ) -> ServiceInfo:
        """Start a long-running service in the VM"""
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            raise ValueError(f"No active sandbox for project {project_id}")

        service_name = service_config["service_name"]
        command = service_config["command"]
        working_dir = service_config.get(
            "working_directory", f"/workspace/{project_id}"
        )
        port = service_config.get("port")
        env_vars = service_config.get("environment_vars", {})

        try:
            # Prepare environment variables
            env_string = " ".join([f"{k}={v}" for k, v in env_vars.items()])

            # Create service start command
            if port:
                # For web services, bind to all interfaces
                full_command = (
                    f"cd {working_dir} && {env_string} nohup {command} "
                    f"> /tmp/{service_name}.log 2>&1 & echo $!"
                )
            else:
                full_command = (
                    f"cd {working_dir} && {env_string} nohup {command} "
                    f"> /tmp/{service_name}.log 2>&1 & echo $!"
                )

            # Start service and get process ID using run_code
            result = sandbox.run_code(f"""
import subprocess
result = subprocess.run('{full_command}', shell=True,
                      capture_output=True, text=True)
print(result.stdout.strip())
""")

            # Extract process ID from result
            process_id = None
            if result and hasattr(result, 'text') and result.text:
                output = result.text.strip()
                if output.isdigit():
                    process_id = int(output)

            service_url = None
            if port:
                hostname = f"{sandbox.sandbox_id}.e2b.dev"
                service_url = f"https://{hostname}:{port}"

            return ServiceInfo(
                service_name=service_name,
                status="running",
                process_id=process_id,
                service_url=service_url,
                log_file=f"/tmp/{service_name}.log"
            )

        except Exception as e:
            logger.error(f"Failed to start service {service_name}: {e}")
            return ServiceInfo(
                service_name=service_name,
                status="failed",
                error=str(e)
            )

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            return False

        try:
            # Kill the process using run_code
            sandbox.run_code(f"""
import subprocess
subprocess.run(['kill', '{process_id}'], check=True)
""")
            return True
        except Exception as e:
            logger.error(f"Failed to stop service with PID {process_id}: {e}")
            return False
