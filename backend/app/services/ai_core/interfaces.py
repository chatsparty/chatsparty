from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from .entities import Agent, Message, ModelConfiguration, ConversationMessage


class ModelProviderInterface(ABC):
    @abstractmethod
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration,
        user_id: Optional[str] = None,
        is_supervisor_call: bool = False
    ) -> str:
        pass


class AgentRepositoryInterface(ABC):
    @abstractmethod
    def create_agent(self, agent: Agent, user_id: str) -> Agent:
        pass
    
    @abstractmethod
    def get_agent(self, agent_id: str, user_id: str = None) -> Optional[Agent]:
        pass
    
    @abstractmethod
    def list_agents(self, user_id: str = None) -> List[Agent]:
        pass
    
    @abstractmethod
    def update_agent(self, agent: Agent) -> Agent:
        pass
    
    @abstractmethod
    def delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        pass


class ConversationRepositoryInterface(ABC):
    @abstractmethod
    def create_conversation(self, conversation_id: str, user_id: str, is_shared: bool = False) -> List[Message]:
        pass
    
    @abstractmethod
    def get_conversation(self, conversation_id: str, user_id: str = None) -> List[Message]:
        pass
    
    @abstractmethod
    def add_message(self, conversation_id: str, message: Message) -> None:
        pass
    
    @abstractmethod
    def clear_conversation(self, conversation_id: str) -> None:
        pass
    
    @abstractmethod
    def get_all_conversations(self, user_id: str = None) -> List[dict]:
        pass
    
    @abstractmethod
    def get_conversation_by_id(self, conversation_id: str, user_id: str = None) -> dict:
        pass
    
    @abstractmethod
    def update_conversation_sharing(self, conversation_id: str, is_shared: bool, user_id: str) -> bool:
        pass


class AIServiceInterface(ABC):
    @abstractmethod
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str = "default",
        user_id: str = None
    ) -> str:
        pass
    
    @abstractmethod
    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int = 20,
        user_id: str = None,
        file_attachments: List[Dict[str, str]] = None,
        project_id: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        pass