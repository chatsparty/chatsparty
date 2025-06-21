from typing import List, Dict, Optional
from datetime import datetime
from ..domain.entities import Agent, Message
from ..domain.interfaces import AgentRepositoryInterface, ConversationRepositoryInterface


class InMemoryAgentRepository(AgentRepositoryInterface):
    def __init__(self):
        self._agents: Dict[str, Agent] = {}
    
    def create_agent(self, agent: Agent) -> Agent:
        self._agents[agent.agent_id] = agent
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        return self._agents.get(agent_id)
    
    def list_agents(self) -> List[Agent]:
        return list(self._agents.values())
    
    def update_agent(self, agent: Agent) -> Agent:
        if agent.agent_id in self._agents:
            self._agents[agent.agent_id] = agent
            return agent
        raise ValueError(f"Agent {agent.agent_id} not found")
    
    def delete_agent(self, agent_id: str) -> bool:
        if agent_id in self._agents:
            del self._agents[agent_id]
            return True
        return False


from ..domain.entities import Agent, Message, Conversation
from ..domain.interfaces import AgentRepositoryInterface, ConversationRepositoryInterface


# Placeholder for actual database models if using a DB
class ConversationModel:
    def __init__(self, conversation_id: str, user_id: str, is_shared: bool = False,
                 agent_ids: Optional[List[str]] = None, current_agent_index: Optional[int] = None,
                 created_at: Optional[datetime] = None, updated_at: Optional[datetime] = None):
        self.id = conversation_id
        self.user_id = user_id
        self.messages: List[Message] = []
        self.is_shared = is_shared
        self.agent_ids = agent_ids if agent_ids else []
        self.current_agent_index = current_agent_index if current_agent_index is not None else 0
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.participants = [] # Can be populated based on messages or agent_ids

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "messages": [msg.__dict__ for msg in self.messages], # Or a more suitable serialization
            "is_shared": self.is_shared,
            "agent_ids": self.agent_ids,
            "current_agent_index": self.current_agent_index,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "participants": self.participants
        }

class InMemoryConversationRepository(ConversationRepositoryInterface):
    def __init__(self):
        self._conversations: Dict[str, ConversationModel] = {}

    def create_conversation(self, conversation_id: str, user_id: str,
                            is_shared: bool = False, agent_ids: Optional[List[str]] = None,
                            current_agent_index: Optional[int] = None) -> Dict[str, Any]:
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = ConversationModel(
                conversation_id=conversation_id,
                user_id=user_id,
                is_shared=is_shared,
                agent_ids=agent_ids,
                current_agent_index=current_agent_index
            )
        return self._conversations[conversation_id].to_dict()

    def get_conversation_details(self, conversation_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        conv = self._conversations.get(conversation_id)
        if conv:
            # In a real scenario, you'd check user_id for authorization if user_id is provided
            return conv.to_dict()
        return None

    def get_conversation_messages(self, conversation_id: str, user_id: str = None) -> List[Message]:
        conv = self._conversations.get(conversation_id)
        if conv:
            # Auth check
            return conv.messages
        return []

    def add_message(self, conversation_id: str, message: Message, user_id: str = None) -> None:
        conv = self._conversations.get(conversation_id)
        if conv:
            # Auth check
            if message.timestamp is None:
                message.timestamp = datetime.now()
            conv.messages.append(message)
            conv.updated_at = datetime.now()
            # Update participants if necessary
            if message.speaker and message.speaker not in conv.participants:
                conv.participants.append(message.speaker)
            if message.agent_id and message.agent_id not in conv.participants:
                 # Assuming agent_id can also identify a participant if speaker is generic
                agent = self._get_agent_name_from_id_placeholder(message.agent_id) # Placeholder
                if agent and agent not in conv.participants:
                    conv.participants.append(agent)

    def _get_agent_name_from_id_placeholder(self, agent_id: str) -> Optional[str]:
        # This is a placeholder. In a real system, you might look up agent name
        # or ensure agent_ids in ConversationModel are primary identifiers for participants.
        return f"Agent_{agent_id[:4]}"


    def update_conversation_metadata(self, conversation_id: str, user_id: str = None, **kwargs) -> bool:
        conv = self._conversations.get(conversation_id)
        if conv:
            # Auth check
            for key, value in kwargs.items():
                if hasattr(conv, key):
                    setattr(conv, key, value)
            conv.updated_at = datetime.now()
            return True
        return False

    def clear_conversation(self, conversation_id: str, user_id: str = None) -> None:
        conv = self._conversations.get(conversation_id)
        if conv:
            # Auth check
            conv.messages = []
            conv.updated_at = datetime.now()
            # Decide if other metadata like agent_ids should be cleared

    def get_all_conversations(self, user_id: str = None) -> List[Dict[str, Any]]:
        # Auth check: filter by user_id if provided
        if user_id:
            return [conv.to_dict() for conv in self._conversations.values() if conv.user_id == user_id]
        return [conv.to_dict() for conv in self._conversations.values()]

    def get_conversation_by_id(self, conversation_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        conv = self._conversations.get(conversation_id)
        if conv:
            # Auth check: if user_id is provided, ensure it matches or conversation is shared
            if user_id and conv.user_id != user_id and not conv.is_shared:
                return None # Or raise HTTPException for unauthorized
            if not user_id and not conv.is_shared: # Trying to access non-shared convo without logging in
                 return None
            return conv.to_dict()
        return None

    def update_conversation_sharing(self, conversation_id: str, is_shared: bool, user_id: str) -> bool:
        conv = self._conversations.get(conversation_id)
        if conv and conv.user_id == user_id:
            conv.is_shared = is_shared
            conv.updated_at = datetime.now()
            return True
        return False

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        conv = self._conversations.get(conversation_id)
        if conv and conv.user_id == user_id:
            del self._conversations[conversation_id]
            return True
        return False