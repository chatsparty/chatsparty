"""
Project-Enhanced Chat Service - Integrates VM workspace access into multi-agent conversations
"""

import logging
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from ...models.database import Conversation as ConversationModel
from ..ai_core.entities import Agent, ConversationMessage, Message
from .chat_service import ChatService
from .enhanced_chat_service import EnhancedChatService

logger = logging.getLogger(__name__)


class ProjectEnhancedChatService(EnhancedChatService):
    """
    🚀 PROJECT-ENHANCED CHAT SERVICE

    Automatically provides agents with full computer access when they're 
    working within a project context. This gives agents:

    - Complete VM workspace control
    - Access to all project files  
    - Running services monitoring
    - Full development environment
    - Collaborative project workspace
    """

    def __init__(
        self,
        base_chat_service: ChatService,
        project_service
    ):
        super().__init__(base_chat_service)
        self.project_service = project_service

    async def agent_chat(
        self,
        agent_id: str,
        message: str,
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        """Enhanced agent chat with automatic project VM access"""

        project_context = await self._get_project_context(conversation_id, user_id)

        if project_context:
            return await self._project_aware_chat(
                agent_id, message, conversation_id, user_id, project_context
            )
        else:
            return await super().agent_chat(agent_id, message, conversation_id, user_id)

    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 10,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None,
        project_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streaming multi-agent conversation with project workspace access"""

        if project_id:
            await self._link_conversation_to_project(conversation_id, project_id, user_id)

        project_context = await self._get_project_context(conversation_id, user_id)

        if project_context:
            async for message in self._project_aware_multi_agent_conversation_stream(
                conversation_id, agent_ids, initial_message, max_turns,
                user_id, file_attachments, project_context
            ):
                yield message
        else:
            async for message in self.base_chat_service._multi_agent_conversation_stream_supervised(
                conversation_id, agent_ids, initial_message, max_turns,
                user_id, file_attachments
            ):
                yield message


    async def _get_project_context(
        self,
        conversation_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get project context for a conversation"""
        try:
            from sqlalchemy.orm import Session

            from ...core.database import get_db

            session = next(get_db())
            try:
                conversation = session.query(ConversationModel).filter(
                    ConversationModel.id == conversation_id
                ).first()

                if not conversation or not conversation.project_id:
                    return None

                project = await self.project_service.get_project(
                    conversation.project_id, user_id
                )

                if not project:
                    return None

                project_status = await self.project_service.get_project_status(
                    project.id
                )

                vm_tools = self.project_service.get_vm_tools_for_project(
                    project.id)

                return {
                    "project": project,
                    "project_status": project_status,
                    "vm_tools": vm_tools,
                    "has_vm_access": vm_tools is not None
                }

            finally:
                session.close()

        except Exception as e:
            logger.error(f"Error getting project context: {str(e)}")
            return None

    async def _link_conversation_to_project(
        self,
        conversation_id: str,
        project_id: str,
        user_id: str
    ) -> bool:
        """Link a conversation to a project"""
        try:
            from sqlalchemy.orm import Session

            from ...core.database import get_db

            session = next(get_db())
            try:
                conversation = session.query(ConversationModel).filter(
                    ConversationModel.id == conversation_id,
                    ConversationModel.user_id == user_id
                ).first()

                if conversation:
                    conversation.project_id = project_id
                    session.commit()
                    return True

                return False

            finally:
                session.close()

        except Exception as e:
            logger.error(f"Error linking conversation to project: {str(e)}")
            return False


    async def _project_aware_chat(
        self,
        agent_id: str,
        message: str,
        conversation_id: str,
        user_id: str,
        project_context: Dict[str, Any]
    ) -> str:
        """Enhanced chat with full project workspace access"""

        try:
            agent_repo = self.base_chat_service._agent_repository
            agent = agent_repo.get_agent(agent_id, user_id)

            if not agent:
                return f"Agent {agent_id} not found"

            enhanced_agent = self._enhance_agent_with_project_context(
                agent, project_context)

            vm_commands = self._extract_vm_commands(message)

            if vm_commands and project_context["has_vm_access"]:
                vm_results = await self._execute_project_vm_commands(
                    project_context, vm_commands
                )

                enhanced_message = f"{message}\n\n=== VM EXECUTION RESULTS ===\n{vm_results}"

                response = await self._get_agent_response_with_project_context(
                    enhanced_agent, enhanced_message, conversation_id, user_id, project_context
                )
            else:
                response = await self._get_agent_response_with_project_context(
                    enhanced_agent, message, conversation_id, user_id, project_context
                )

            return response

        except Exception as e:
            logger.error(f"Error in project-aware chat: {str(e)}")
            return await super().agent_chat(agent_id, message, conversation_id, user_id)

    async def _project_aware_multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int,
        user_id: str,
        file_attachments: List[Dict[str, str]],
        project_context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streaming multi-agent conversation with project access"""


        yield {
            "type": "project_context",
            "project_name": project_context["project"].name,
            "vm_status": project_context["project_status"]["vm_status"],
            "message": f"🚀 Project workspace '{project_context['project'].name}' is active with full VM access"
        }

        # Use the streaming version directly
        async for message in self._project_aware_multi_agent_conversation_stream(
            conversation_id, agent_ids, initial_message, max_turns,
            user_id, file_attachments, project_context
        ):
            yield message


    def _enhance_agent_with_project_context(
        self,
        agent: Agent,
        project_context: Dict[str, Any]
    ) -> Agent:
        """Enhance agent system prompt with project workspace context"""

        project = project_context["project"]
        project_status = project_context["project_status"]

        project_prompt = f"""
=== PROJECT WORKSPACE CONTEXT ===
🚀 Project: {project.name}
📝 Description: {project.description or 'No description'}
🖥️ VM Status: {project_status.get('vm_status', 'inactive')}
🔧 VM Container ID: {project.vm_container_id or 'Not set'}

AVAILABLE RESOURCES:
- Full Linux VM with root access
- VM Workspace: /workspace (project files synced here)
- Running Services: {len(project_status.get('services', []))} active
- Project Files: {project_status.get('files', {}).get('total', 0)} files ({project_status.get('files', {}).get('synced', 0)} synced)

🛠️ VM CAPABILITIES AVAILABLE:
You have FULL computer access through the project VM. You can:
✅ Execute any shell command with full privileges
✅ Install software packages (apt, pip, npm, yarn, etc.)  
✅ Create, read, write, and manage files
✅ Start web servers, databases, and services
✅ Run development tools and scripts
✅ Access the internet for downloads and APIs
✅ Git operations and repository management
✅ Complete development workflows

VM COMMANDS:
To execute commands in the VM, use: /vm <command>
Examples:
- /vm ls -la                    (list files)
- /vm pip install pandas       (install packages)
- /vm python app.py &          (start services)
- /vm git status               (git operations)

SERVICE MANAGEMENT:
- Running Services: {', '.join([s.get('name', 'unknown') for s in project_status.get('services', [])])}
- Available Ports: Check running services for port usage

Remember: You're working in a shared project workspace where other agents may also be active.
Be collaborative and document your work for the team.
"""

        enhanced_agent = Agent(
            agent_id=agent.agent_id,
            name=agent.name,
            prompt=agent.prompt + "\n\n" + project_prompt,
            characteristics=agent.characteristics,
            model_config=agent.model_config,
            chat_style=agent.chat_style,
            connection_id=agent.connection_id,
            gender=agent.gender,
            voice_config=agent.voice_config,
        )

        return enhanced_agent

    def _create_project_context_message(
        self,
        initial_message: str,
        project_context: Dict[str, Any],
        file_attachments: List[Dict[str, str]]
    ) -> str:
        """Create enhanced initial message with project context"""

        project = project_context["project"]
        project_status = project_context["project_status"]

        context_message = f"""
=== PROJECT WORKSPACE ACTIVE ===
🚀 Project: {project.name}
🖥️ VM Status: {project_status.get('vm_status', 'inactive')}
📁 Files: {project_status.get('files', {}).get('total', 0)} project files available
🚀 Services: {len(project_status.get('services', []))} running services

{initial_message}
"""

        if file_attachments:
            context_message += "\n\n=== ATTACHED FILES ===\n"
            for attachment in file_attachments:
                context_message += f"\n--- {attachment['filename']} ({attachment['file_type']}) ---\n"
                context_message += f"{attachment['content']}\n"

        return context_message

    def _extract_vm_commands(self, message: str) -> List[str]:
        """Extract VM commands from message (commands starting with /vm)"""
        import re

        vm_commands = re.findall(r'/vm\s+(.+)', message, re.MULTILINE)
        return vm_commands

    async def _execute_project_vm_commands(
        self,
        project_context: Dict[str, Any],
        commands: List[str]
    ) -> str:
        """Execute VM commands in the project workspace"""

        vm_tools = project_context["vm_tools"]
        if not vm_tools:
            return "❌ VM tools not available for this project"

        results = []
        for command in commands:
            try:
                result = await vm_tools.execute_command(command, "/workspace")
                results.append(
                    f"$ {command}\n{result.get('output', 'No output')}")

                if result.get('error'):
                    results.append(f"Error: {result['error']}")

            except Exception as e:
                results.append(f"$ {command}\nError: {str(e)}")

        return "\n\n".join(results)

    async def _get_agent_response_with_project_context(
        self,
        enhanced_agent: Agent,
        message: str,
        conversation_id: str,
        user_id: str,
        project_context: Dict[str, Any]
    ) -> str:
        """Get agent response with project context"""

        conversation_messages = self.base_chat_service._conversation_repository.get_conversation(
            conversation_id, user_id
        )

        current_message = Message(role="user", content=message, speaker="user")
        conversation_messages.append(current_message)

        response = await self.base_chat_service._model_provider.chat_completion(
            conversation_messages,
            enhanced_agent.get_system_prompt(),
            enhanced_agent.model_config,
            user_id=user_id
        )

        return response

    def _build_conversation_context(
        self,
        conversation_log: List[ConversationMessage],
        enhanced_initial_message: str,
        file_attachments: List[Dict[str, str]],
        project_context: Dict[str, Any]
    ) -> List[Message]:
        """Build conversation context for agents"""

        context_messages = []

        if len(conversation_log) > 1:
            recent_messages = conversation_log[-5:]
            context = "Recent conversation:\n"
            for msg in recent_messages:
                if hasattr(msg, 'message'):
                    display_message = enhanced_initial_message if (
                        msg.speaker == "user" and msg == conversation_log[0]
                    ) else msg.message
                    context += f"{msg.speaker}: {display_message}\n"

            context += "\nPlease continue the conversation naturally from your perspective."

            if file_attachments:
                context += f"\n\nRemember: The user has attached {len(file_attachments)} file(s) with relevant content."

            context_messages = [Message(role="user", content=context)]
        else:
            context_messages = [
                Message(role="user", content=enhanced_initial_message)]

        return context_messages