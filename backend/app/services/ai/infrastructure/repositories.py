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


class InMemoryConversationRepository(ConversationRepositoryInterface):
    def __init__(self):
        self._conversations: Dict[str, List[Message]] = {}
    
    def create_conversation(self, conversation_id: str) -> List[Message]:
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []
        return self._conversations[conversation_id]
    
    def get_conversation(self, conversation_id: str) -> List[Message]:
        return self._conversations.get(conversation_id, [])
    
    def add_message(self, conversation_id: str, message: Message) -> None:
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []
        
        if message.timestamp is None:
            message.timestamp = datetime.now()
        
        self._conversations[conversation_id].append(message)
    
    def clear_conversation(self, conversation_id: str) -> None:
        if conversation_id in self._conversations:
            self._conversations[conversation_id] = []