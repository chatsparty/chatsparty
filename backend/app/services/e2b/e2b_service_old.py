import asyncio
import hashlib
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from e2b_code_interpreter import Sandbox

from ..project.domain.entities import ProjectFile, ProjectVMService, VMCommandResult
from ..storage.storage_factory import get_storage_provider

logger = logging.getLogger(__name__)


class E2BService:
    """Service for managing E2B sandbox VMs with full computer access"""

    def __init__(self):
        self.active_sandboxes: Dict[str, Sandbox] = {}
        self.api_key = os.getenv('E2B_API_KEY')
        self.storage_provider = get_storage_provider()
        self.default_timeout = 30

        if not self.api_key:
            logger.warning(
                "E2B_API_KEY not set. VM features will be disabled.")

    async def create_project_sandbox(
        self,
        project_id: str,
        template_id: Optional[str] = None,
        environment_type: str = "full"
    ) -> Dict[str, Any]:
        """
        Create a new E2B sandbox for a project with full computer access

        Args:
            project_id: Unique project identifier
            template_id: Optional E2B template ID
            environment_type: Type of environment (python, nodejs, full)
        """
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
                result = sandbox.run_code(f"import os; os.makedirs('{workspace_path}', exist_ok=True); print('Workspace created')")
                if result and hasattr(result, 'text') and result.text:
                    logger.info(f"Workspace creation result: {result.text}")
                elif result:
                    logger.info(f"Workspace creation result: {result}")
                else:
                    logger.info("Workspace creation completed (no output)")
            except Exception as e:
                logger.warning(f"Failed to create workspace directory: {e}")

            # Skip environment setup for now to speed up the process
            # await self._setup_development_environment(project_id, environment_type, workspace_path)
            logger.info("Skipping environment setup for faster startup")

            vm_info = {
                "sandbox_id": sandbox.sandbox_id,
                "status": "active",
                "workspace_path": workspace_path,
                "environment_type": environment_type,
                "vm_url": f"https://{sandbox.sandbox_id}.e2b.dev",
                "created_at": datetime.now().isoformat()
            }

            logger.info(f"Successfully created E2B sandbox {sandbox.sandbox_id} for project {project_id}")
            return vm_info

        except Exception as e:
            logger.error(f"Failed to create E2B sandbox for project {project_id}: {e}")
            # Clean up if sandbox was partially created
            if project_id in self.active_sandboxes:
                try:
                    self.active_sandboxes[project_id].close()
                    del self.active_sandboxes[project_id]
                except:
                    pass
            raise

    async def _setup_development_environment(
        self,
        project_id: str,
        environment_type: str,
        workspace_path: str
    ) -> None:
        """Set up development environment in the sandbox"""
        
        if project_id not in self.active_sandboxes:
            raise ValueError(f"No active sandbox for project {project_id}")

        sandbox = self.active_sandboxes[project_id]

        setup_commands = {
            "python": [
                "apt-get update -qq",
                "apt-get install -y python3-pip python3-venv git curl wget htop tree",
                "pip3 install --upgrade pip",
                "pip3 install jupyter pandas numpy matplotlib seaborn scikit-learn flask django fastapi"
            ],
            "nodejs": [
                "apt-get update -qq",
                "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
                "apt-get install -y nodejs git curl wget htop tree",
                "npm install -g typescript @types/node ts-node nodemon create-react-app @vue/cli @angular/cli"
            ],
            "full": [
                "apt-get update -qq",
                "apt-get install -y python3-pip nodejs npm git curl wget htop tree vim nano",
                "apt-get install -y docker.io postgresql-client redis-tools",
                "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
                "apt-get install -y nodejs",
                "pip3 install --upgrade pip",
                "pip3 install jupyter pandas numpy matplotlib seaborn scikit-learn",
                "pip3 install flask django fastapi uvicorn gunicorn",
                "npm install -g typescript @types/node ts-node nodemon",
                "npm install -g create-react-app @vue/cli @angular/cli"
            ]
        }

        commands = setup_commands.get(environment_type, setup_commands["full"])

        # Execute actual setup commands using bash
        logger.info(f"Setting up development environment for {environment_type}")
        for command in commands:
            try:
                logger.debug(f"Running: {command}")
                result = sandbox.run_code(f"""
import subprocess
result = subprocess.run('{command}', shell=True, capture_output=True, text=True)
print(f"Exit code: {{result.returncode}}")
if result.stdout:
    print(f"Output: {{result.stdout}}")
if result.stderr:
    print(f"Error: {{result.stderr}}")
""")
                logger.debug(f"Command result: {result.text if hasattr(result, 'text') else result}")
            except Exception as e:
                logger.warning(f"Failed to run setup command '{command}': {e}")
        
        logger.info("Environment setup completed")

    async def sync_files_to_vm(
        self,
        project_id: str,
        files: List[ProjectFile]
    ) -> bool:
        """Sync project files to the VM workspace"""

        if project_id not in self.active_sandboxes:
            logger.error(f"No active sandbox for project {project_id}")
            return False

        sandbox = self.active_sandboxes[project_id]
        workspace_path = f"/workspace/{project_id}"

        try:
            for file in files:
                # Download file from storage
                file_content = await self._download_file_from_storage(file.file_path)

                # Determine VM path
                vm_path = file.vm_path or f"{workspace_path}/{file.filename}"

                # Create directory if needed
                vm_dir = str(Path(vm_path).parent)
                sandbox.run_code(f"import os; os.makedirs('{vm_dir}', exist_ok=True)")

                # Write file to VM using E2B files API
                if isinstance(file_content, str):
                    sandbox.files.write(vm_path, file_content)
                else:
                    # Handle binary files - convert to string for now
                    sandbox.files.write(vm_path, str(file_content))

                # Set file permissions if specified
                if file.file_permissions:
                    sandbox.run_code(f"""
import subprocess
subprocess.run(['chmod', '{file.file_permissions}', '{vm_path}'], check=True)
""")

                # Make executable if needed
                if file.is_executable:
                    sandbox.run_code(f"""
import subprocess
subprocess.run(['chmod', '+x', '{vm_path}'], check=True)
""")

                logger.info(f"Synced file {file.filename} to VM at {vm_path}")

            return True

        except Exception as e:
            logger.error(
                f"Failed to sync files to VM for project {project_id}: {e}")
            return False

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
        if project_id not in self.active_sandboxes:
            # Try to reconnect if we have sandbox info
            logger.warning(f"No active sandbox for project {project_id}, attempting to reconnect...")
            raise ValueError(f"No active sandbox for project {project_id}")

        sandbox = self.active_sandboxes[project_id]
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
    result = subprocess.run('{command}', shell=True, capture_output=True, text=True)
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
                elif hasattr(result, 'stdout') and result.stdout:
                    output = result.stdout
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

    async def read_file(self, project_id: str, file_path: str) -> str:
        """Read file content from VM filesystem"""
        if project_id not in self.active_sandboxes:
            raise ValueError(f"No active sandbox for project {project_id}")

        sandbox = self.active_sandboxes[project_id]

        try:
            # Use E2B files API to read file
            content = sandbox.files.read(file_path)
            return content
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            raise

    async def write_file(
        self,
        project_id: str,
        file_path: str,
        content: str,
        permissions: Optional[str] = None
    ) -> bool:
        """Write content to file in VM filesystem"""
        if project_id not in self.active_sandboxes:
            raise ValueError(f"No active sandbox for project {project_id}")

        sandbox = self.active_sandboxes[project_id]

        try:
            # Create directory if needed
            file_dir = str(Path(file_path).parent)
            sandbox.run_code(f"import os; os.makedirs('{file_dir}', exist_ok=True)")

            # Write file content using E2B files API
            sandbox.files.write(file_path, content)

            # Set permissions if specified
            if permissions:
                sandbox.run_code(f"""
import subprocess
subprocess.run(['chmod', '{permissions}', '{file_path}'], check=True)
""")

            return True

        except Exception as e:
            logger.error(f"Failed to write file {file_path}: {e}")
            return False

    async def list_directory(self, project_id: str, path: str = "/workspace") -> List[Dict[str, Any]]:
        """List directory contents in VM"""
        if project_id not in self.active_sandboxes:
            raise ValueError(f"No active sandbox for project {project_id}")

        sandbox = self.active_sandboxes[project_id]

        try:
            # Use subprocess to list directory
            result = sandbox.run_code(f"""
import subprocess
import os

try:
    result = subprocess.run(['ls', '-la', '{path}'], capture_output=True, text=True)
    if result.returncode == 0:
        print("OUTPUT_START")
        print(result.stdout)
        print("OUTPUT_END")
    else:
        print("ERROR: Directory listing failed")
except Exception as e:
    print(f"ERROR: {{str(e)}}")
""")
            
            # Extract output from result - handle None case
            if result is None:
                logger.debug(f"Directory listing returned None for path {path}")
                ls_output = ""
            else:
                output = ""
                if hasattr(result, 'text') and result.text:
                    output = result.text
                elif hasattr(result, 'stdout') and result.stdout:
                    output = result.stdout
                else:
                    output = str(result) if result else ""
                
                # Extract the actual ls output
                ls_output = ""
                capturing = False
                for line in output.split('\n'):
                    if line.strip() == "OUTPUT_START":
                        capturing = True
                        continue
                    elif line.strip() == "OUTPUT_END":
                        break
                    elif capturing:
                        ls_output += line + '\n'

            files = []
            # Skip first line (total)
            lines = ls_output.strip().split('\n')
            for line in lines[1:] if len(lines) > 1 else []:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 9:
                        files.append({
                            "permissions": parts[0],
                            "links": parts[1],
                            "owner": parts[2],
                            "group": parts[3],
                            "size": parts[4],
                            "date": " ".join(parts[5:8]),
                            "name": " ".join(parts[8:])
                        })

            return files

        except Exception as e:
            logger.error(f"Failed to list directory {path}: {e}")
            return []

    async def list_files_recursive(self, project_id: str, path: str = "/workspace") -> Dict[str, Any]:
        """List files recursively in a tree structure"""
        if project_id not in self.active_sandboxes:
            logger.warning(f"No active sandbox for project {project_id}, attempting to reconnect...")
            raise ValueError(f"No active sandbox for project {project_id}")
        
        return await self._build_file_tree_from_sandbox(project_id, path)
    
    
    async def _build_file_tree_from_sandbox(self, project_id: str, path: str) -> Dict[str, Any]:
        """Build file tree recursively from real sandbox"""
        sandbox = self.active_sandboxes[project_id]
        
        async def build_tree(current_path: str) -> Dict[str, Any]:
            try:
                # List directory contents using ls -1 for simple listing
                result = sandbox.run_code(f"""
import subprocess
import os

try:
    result = subprocess.run(['ls', '-1', '{current_path}'], capture_output=True, text=True)
    if result.returncode == 0:
        print("OUTPUT_START")
        print(result.stdout)
        print("OUTPUT_END")
    else:
        print("OUTPUT_START")
        print("")
        print("OUTPUT_END")
except Exception as e:
    print("OUTPUT_START")
    print("")
    print("OUTPUT_END")
""")
                
                # Extract output from result - handle None case
                if result is None:
                    logger.debug(f"run_code returned None for path {current_path}")
                    ls_output = ""
                else:
                    output = ""
                    if hasattr(result, 'text') and result.text:
                        output = result.text
                    elif hasattr(result, 'stdout') and result.stdout:
                        output = result.stdout
                    else:
                        output = str(result) if result else ""
                    
                    # Extract the actual ls output
                    ls_output = ""
                    capturing = False
                    for line in output.split('\n'):
                        if line.strip() == "OUTPUT_START":
                            capturing = True
                            continue
                        elif line.strip() == "OUTPUT_END":
                            break
                        elif capturing:
                            ls_output += line + '\n'
                
                if not ls_output.strip():
                    # Directory might not exist or be empty
                    logger.debug(f"Directory {current_path} is empty or doesn't exist")
                    paths = []
                else:
                    paths = [line.strip() for line in ls_output.strip().split('\n') if line.strip()]
                
                # Get the current directory name
                dir_name = os.path.basename(current_path) if current_path != "/workspace" else project_id
                
                node = {
                    "name": dir_name,
                    "path": current_path,
                    "type": "directory",
                    "children": []
                }
                
                # Process each item
                for item_name in paths:
                    if not item_name or item_name in ['.', '..']:
                        continue
                    
                    item_path = f"{current_path}/{item_name}"
                    
                    # Check if it's a directory
                    check_result = sandbox.run_code(f"""
import os
if os.path.isdir('{item_path}'):
    print('dir')
else:
    print('file')
""")
                    
                    # Extract check result - handle None case
                    if check_result is None:
                        logger.debug(f"Directory check returned None for {item_path}")
                        is_dir = False
                    else:
                        check_output = ""
                        if hasattr(check_result, 'text') and check_result.text:
                            check_output = check_result.text
                        elif hasattr(check_result, 'stdout') and check_result.stdout:
                            check_output = check_result.stdout
                        else:
                            check_output = str(check_result) if check_result else ""
                        is_dir = check_output.strip() == 'dir'
                    
                    if is_dir:
                        # Recursively build subdirectory
                        subdir = await build_tree(item_path)
                        node["children"].append(subdir)
                    else:
                        # Add file
                        node["children"].append({
                            "name": item_name,
                            "path": item_path,
                            "type": "file"
                        })
                
                return node
                
            except Exception as e:
                logger.error(f"Failed to build file tree for {current_path}: {e}")
                # Return empty directory structure on error
                return {
                    "name": os.path.basename(current_path) if current_path != "/workspace" else project_id,
                    "path": current_path,
                    "type": "directory",
                    "children": []
                }
        
        return await build_tree(path)

    async def reconnect_to_sandbox(self, project_id: str, sandbox_id: str) -> bool:
        """Reconnect to an existing E2B sandbox"""
        try:
            if not self.api_key:
                raise ValueError("E2B API key not configured")

            logger.info(f"Reconnecting to E2B sandbox {sandbox_id} for project {project_id}")
            
            # Try to connect to existing sandbox
            try:
                # Method 1: Try Sandbox.connect
                sandbox = Sandbox.connect(sandbox_id, api_key=self.api_key)
            except Exception as e1:
                logger.warning(f"Sandbox.connect failed: {e1}, trying alternative method")
                try:
                    # Method 2: Try creating with existing ID
                    sandbox = Sandbox(api_key=self.api_key, sandbox_id=sandbox_id)
                except Exception as e2:
                    logger.error(f"Alternative reconnection method failed: {e2}")
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

    async def get_or_reconnect_sandbox(self, project_id: str, sandbox_id: str = None) -> bool:
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
                sandbox = self.active_sandboxes[project_id]
                
                # Close the sandbox
                sandbox.close()
                
                # Remove from active sandboxes
                del self.active_sandboxes[project_id]
                
                logger.info(f"Destroyed sandbox for project {project_id}")
                return True
            else:
                logger.warning(f"No active sandbox found for project {project_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to destroy sandbox for project {project_id}: {e}")
            return False

    async def start_service(
        self,
        project_id: str,
        service_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Start a long-running service in the VM"""
        if project_id not in self.active_sandboxes:
            raise ValueError(f"No active sandbox for project {project_id}")

        sandbox = self.active_sandboxes[project_id]

        service_name = service_config["service_name"]
        command = service_config["command"]
        working_dir = service_config.get(
            "working_directory", f"/workspace/{project_id}")
        port = service_config.get("port")
        env_vars = service_config.get("environment_vars", {})

        try:
            # Prepare environment variables
            env_string = " ".join([f"{k}={v}" for k, v in env_vars.items()])

            # Create service start command
            if port:
                # For web services, bind to all interfaces
                full_command = f"cd {working_dir} && {env_string} nohup {command} > /tmp/{service_name}.log 2>&1 & echo $!"
            else:
                full_command = f"cd {working_dir} && {env_string} nohup {command} > /tmp/{service_name}.log 2>&1 & echo $!"

            # Start service and get process ID
            result = await sandbox.commands.run(full_command)
            process_id = int(result.stdout.strip()
                             ) if result.stdout.strip().isdigit() else None

            service_url = None
            if port:
                hostname = sandbox.get_hostname()
                service_url = f"https://{hostname}:{port}"

            return {
                "service_name": service_name,
                "status": "running",
                "process_id": process_id,
                "service_url": service_url,
                "log_file": f"/tmp/{service_name}.log"
            }

        except Exception as e:
            logger.error(f"Failed to start service {service_name}: {e}")
            return {
                "service_name": service_name,
                "status": "failed",
                "error": str(e)
            }

    async def stop_service(self, project_id: str, process_id: int) -> bool:
        """Stop a service by process ID"""
        if project_id not in self.active_sandboxes:
            return False

        sandbox = self.active_sandboxes[project_id]

        try:
            await sandbox.commands.run(f"kill {process_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to stop service with PID {process_id}: {e}")
            return False

    async def get_sandbox_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get information about the project's sandbox"""
        if project_id not in self.active_sandboxes:
            return None

        sandbox = self.active_sandboxes[project_id]

        try:
            # Get system information
            cpu_info = await sandbox.commands.run("nproc")
            memory_info = await sandbox.commands.run("free -h")
            disk_info = await sandbox.commands.run("df -h /")
            uptime_info = await sandbox.commands.run("uptime")

            return {
                "sandbox_id": sandbox.id,
                "hostname": sandbox.get_hostname(),
                "cpu_cores": cpu_info.stdout.strip(),
                "memory_info": memory_info.stdout,
                "disk_info": disk_info.stdout,
                "uptime": uptime_info.stdout.strip(),
                "workspace_path": f"/workspace/{project_id}"
            }

        except Exception as e:
            logger.error(f"Failed to get sandbox info: {e}")
            return None

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

    async def destroy_project_sandbox(self, project_id: str) -> bool:
        """Destroy the sandbox for a project"""
        return await self.cleanup_sandbox(project_id)

    async def cleanup_sandbox(self, project_id: str) -> bool:
        """Clean up and terminate sandbox"""
        if project_id not in self.active_sandboxes:
            return True

        try:
            sandbox = self.active_sandboxes[project_id]
            # E2B code interpreter sandboxes are automatically cleaned up
            del self.active_sandboxes[project_id]
            logger.info(f"Cleaned up sandbox for project {project_id}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to cleanup sandbox for project {project_id}: {e}")
            return False

    async def _download_file_from_storage(self, file_path: str) -> bytes:
        """Download file content from storage provider"""
        # This would depend on your storage provider implementation
        # For now, return empty bytes - implement based on your storage system
        return b""

    def is_sandbox_active(self, project_id: str) -> bool:
        """Check if sandbox is active for project"""
        return project_id in self.active_sandboxes
