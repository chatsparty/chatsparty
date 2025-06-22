import logging
from typing import Dict, List

from ..domain.models import EnvironmentConfig
from ..interfaces.environment_manager import IEnvironmentManager
from .sandbox_manager import SandboxManager

logger = logging.getLogger(__name__)


class EnvironmentManager(IEnvironmentManager):
    """Implementation of environment management for E2B sandboxes"""

    def __init__(self, sandbox_manager: SandboxManager):
        self.sandbox_manager = sandbox_manager

    async def setup_development_environment(
        self,
        project_id: str,
        environment_type: str,
        workspace_path: str
    ) -> None:
        """Set up development environment in the sandbox"""

        sandbox = self.sandbox_manager.get_sandbox(project_id)
        if not sandbox:
            raise ValueError(f"No active sandbox for project {project_id}")

        config = self.get_environment_config(environment_type)
        commands = config.setup_commands

        # Execute actual setup commands using bash
        logger.info(
            f"Setting up development environment for {environment_type}"
        )
        for command in commands:
            try:
                logger.debug(f"Running: {command}")
                result = sandbox.run_code(f"""
import subprocess
result = subprocess.run('{command}', shell=True,
                      capture_output=True, text=True)
print(f"Exit code: {{result.returncode}}")
if result.stdout:
    print(f"Output: {{result.stdout}}")
if result.stderr:
    print(f"Error: {{result.stderr}}")
""")
                logger.debug(
                    f"Command result: "
                    f"{result.text if hasattr(result, 'text') else result}"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to run setup command '{command}': {e}"
                )

        logger.info("Environment setup completed")

    def get_environment_config(
        self,
        environment_type: str
    ) -> EnvironmentConfig:
        """Get environment configuration for a specific type"""
        setup_commands_map: Dict[str, List[str]] = {
            "python": [
                "apt-get update -qq",
                "apt-get install -y python3-pip python3-venv git curl wget "
                "htop tree",
                "pip3 install --upgrade pip",
                "pip3 install jupyter pandas numpy matplotlib seaborn "
                "scikit-learn flask django fastapi"
            ],
            "nodejs": [
                "apt-get update -qq",
                "curl -fsSL https://deb.nodesource.com/setup_18.x | "
                "sudo -E bash -",
                "apt-get install -y nodejs git curl wget htop tree",
                "npm install -g typescript @types/node ts-node nodemon "
                "create-react-app @vue/cli @angular/cli"
            ],
            "full": [
                "apt-get update -qq",
                "apt-get install -y python3-pip nodejs npm git curl wget "
                "htop tree vim nano",
                "apt-get install -y docker.io postgresql-client redis-tools",
                "curl -fsSL https://deb.nodesource.com/setup_18.x | "
                "sudo -E bash -",
                "apt-get install -y nodejs",
                "pip3 install --upgrade pip",
                "pip3 install jupyter pandas numpy matplotlib seaborn "
                "scikit-learn",
                "pip3 install flask django fastapi uvicorn gunicorn",
                "npm install -g typescript @types/node ts-node nodemon",
                "npm install -g create-react-app @vue/cli @angular/cli"
            ]
        }

        commands = setup_commands_map.get(
            environment_type, setup_commands_map["full"]
        )

        return EnvironmentConfig(
            environment_type=environment_type,
            setup_commands=commands,
            workspace_path=f"/workspace/{environment_type}"
        )