from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from .entities import Agent, Message, ModelConfiguration, ConversationMessage


class ModelProviderInterface(ABC):
    @abstractmethod
    async def chat_completion(
        self, 
        messages: List[Message], 
        system_prompt: str,
        model_config: ModelConfiguration
    ) -> str:
        pass


class AgentRepositoryInterface(ABC):
    @abstractmethod
    def create_agent(self, agent: Agent) -> Agent:
        pass
    
    @abstractmethod
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        pass
    
    @abstractmethod
    def list_agents(self) -> List[Agent]:
        pass
    
    @abstractmethod
    def update_agent(self, agent: Agent) -> Agent:
        pass
    
    @abstractmethod
    def delete_agent(self, agent_id: str) -> bool:
        pass


class ConversationRepositoryInterface(ABC):
    @abstractmethod
    def create_conversation(self, conversation_id: str) -> List[Message]:
        pass
    
    @abstractmethod
    def get_conversation(self, conversation_id: str) -> List[Message]:
        pass
    
    @abstractmethod
    def add_message(self, conversation_id: str, message: Message) -> None:
        pass
    
    @abstractmethod
    def clear_conversation(self, conversation_id: str) -> None:
        pass


class AIServiceInterface(ABC):
    @abstractmethod
    async def agent_chat(
        self, 
        agent_id: str, 
        message: str, 
        conversation_id: str
    ) -> str:
        pass
    
    @abstractmethod
    async def multi_agent_conversation(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int
    ) -> List[ConversationMessage]:
        pass
    
    @abstractmethod
    async def multi_agent_conversation_stream(
        self,
        conversation_id: str,
        agent_ids: List[str],
        initial_message: str,
        max_turns: int
    ) -> AsyncGenerator[Dict[str, Any], None]:
        pass