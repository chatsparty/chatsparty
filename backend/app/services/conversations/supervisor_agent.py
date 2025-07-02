from typing import List, Dict, Optional
import logging
from ..ai_core.entities import Message, ConversationMessage, ModelConfiguration, Agent
from ..ai_core.interfaces import ModelProviderInterface

logger = logging.getLogger(__name__)


class SupervisorAgent:
    """
    Invisible coordinator agent that manages multi-agent conversations by
    determining which agent should speak next and when conversations should end.
    """
    
    def __init__(
        self,
        agents: List[Agent],
        model_provider: ModelProviderInterface
    ):
        self._agents = agents
        self._model_provider = model_provider
        
    async def determine_next_speaker(
        self,
        current_message: str,
        conversation_messages: List[ConversationMessage],
        user_id: str = None
    ) -> str:
        """
        Determine which agent should speak next in the conversation.
        
        Returns:
            Agent ID or "CONVERSATION_COMPLETE" if conversation should end
        """
        try:
            # Check if conversation should end first
            should_end = await self._should_end_conversation(conversation_messages)
            if should_end:
                return "CONVERSATION_COMPLETE"
            
            # Select next agent
            agents_info = self._get_agents_info()
            selection_prompt = self._build_selection_prompt(current_message, conversation_messages, agents_info)
            
            model_config = self._get_supervisor_model_config()
            
            response = await self._model_provider.chat_completion(
                messages=[Message(role="user", content=selection_prompt)],
                system_prompt=self._get_supervisor_system_prompt(),
                model_config=model_config,
                user_id=user_id,
                is_supervisor_call=True
            )
            
            selected_agent_id = self._parse_agent_selection(response)
            
            if selected_agent_id:
                logger.info(f"Supervisor selected agent: {selected_agent_id}")
                return selected_agent_id
            else:
                logger.warning("Supervisor failed to select valid agent, using fallback")
                return self._get_fallback_agent()
                
        except Exception as e:
            logger.error(f"Supervisor agent selection failed: {e}")
            return self._get_fallback_agent()
    
    async def _should_end_conversation(
        self,
        conversation_messages: List[ConversationMessage]
    ) -> bool:
        """Determine if the conversation should naturally end."""
        try:
            if len(conversation_messages) < 3:
                return False
                
            termination_prompt = self._build_termination_prompt(conversation_messages)
            
            model_config = ModelConfiguration(
                provider="ollama",
                model_name="gemma2:2b"
            )
            
            response = await self._model_provider.chat_completion(
                messages=[Message(role="user", content=termination_prompt)],
                system_prompt=self._get_termination_system_prompt(),
                model_config=model_config,
                is_supervisor_call=True
            )
            
            should_end = "yes" in response.lower().strip()
            
            logger.info(f"Supervisor termination decision: {should_end}")
            return should_end
            
        except Exception as e:
            logger.error(f"Supervisor termination decision failed: {e}")
            return False
    
    def _get_agents_info(self) -> List[Dict[str, str]]:
        """Get agent information for selection decision."""
        return [
            {
                "id": agent.agent_id,
                "name": agent.name,
                "description": agent.characteristics or "General purpose agent",
                "expertise": agent.characteristics or "General purpose agent"
            }
            for agent in self._agents
        ]
    
    def _build_selection_prompt(
        self,
        current_message: str,
        conversation_messages: List[ConversationMessage],
        agents_info: List[Dict[str, str]]
    ) -> str:
        """Build prompt for agent selection decision."""
        recent_messages = conversation_messages[-5:] if len(conversation_messages) > 5 else conversation_messages
        
        conversation_context = ""
        for msg in recent_messages:
            speaker = msg.speaker if msg.speaker != "user" else "User"
            conversation_context += f"{speaker}: {msg.message}\n"
        
        # Add current message
        conversation_context += f"Current message: {current_message}\n"
        
        agents_list = ""
        for agent in agents_info:
            agents_list += f"- {agent['id']}: {agent['name']} - {agent['description']}\n"
        
        last_speaker = recent_messages[-1].speaker if recent_messages else "unknown"
        
        prompt = f"""
Available agents:
{agents_list}

Recent conversation:
{conversation_context}

Based on the conversation context and each agent's expertise, which agent should respond next?
Consider:
1. Which agent's expertise is most relevant to the current topic
2. Which agent hasn't spoken recently (for variety)
3. Which agent would provide the most valuable response
4. The selected agent should BUILD ON the current message, not repeat similar content

IMPORTANT: The last message was from {last_speaker}. Select an agent who can meaningfully continue from that point without repetition.

Respond with only the agent ID (e.g., "agent_1").
"""
        
        return prompt
    
    def _build_termination_prompt(self, conversation_messages: List[ConversationMessage]) -> str:
        """Build prompt for conversation termination decision."""
        recent_messages = conversation_messages[-5:] if len(conversation_messages) > 5 else conversation_messages
        
        conversation_context = ""
        for msg in recent_messages:
            speaker = msg.speaker if msg.speaker != "user" else "User"
            conversation_context += f"{speaker}: {msg.message}\n"
        
        prompt = f"""
Recent conversation:
{conversation_context}

Has this conversation reached a natural conclusion? Consider:
1. Have the main topics been thoroughly discussed?
2. Are agents starting to repeat themselves?
3. Has the user's question/request been adequately addressed?
4. Are there clear ending signals in the recent messages?

Respond with only "yes" if the conversation should end, or "no" if it should continue.
"""
        
        return prompt
    
    def _get_supervisor_system_prompt(self) -> str:
        """System prompt for supervisor agent selection."""
        return """You are a conversation supervisor for a group chat. Your role is to analyze conversations and select the most appropriate agent to respond next. You are invisible to users. 

Think of this as a natural group chat between friends/colleagues, not a customer service interaction. Consider:
- Who would naturally want to respond in this situation?
- Who hasn't spoken in a while and might want to chime in?
- Is this a moment for agreement, disagreement, jokes, or just acknowledgment?
- Not every message needs a lengthy or helpful response

Be decisive and always select exactly one agent ID."""
    
    def _get_termination_system_prompt(self) -> str:
        """System prompt for conversation termination decisions."""
        return """You are a conversation supervisor analyzing whether a group chat conversation has reached its natural conclusion. 

Consider:
- Has the conversation naturally died down?
- Are people just exchanging pleasantries with no real topic?
- Has the main topic been discussed and people are saying goodbye?
- Is the conversation becoming repetitive or forced?

Remember: Group chats don't always have clear endings. Sometimes they just naturally pause.

Respond only with "yes" or "no"."""
    
    def _parse_agent_selection(self, response: str) -> Optional[str]:
        """Parse supervisor response to extract selected agent ID."""
        response = response.strip().lower()
        
        agent_ids = [agent.agent_id for agent in self._agents]
        
        for agent_id in agent_ids:
            if agent_id.lower() in response:
                return agent_id
        
        for i, agent_id in enumerate(agent_ids):
            if str(i + 1) in response or f"agent_{i + 1}" in response:
                return agent_id
        
        return None
    
    def _get_supervisor_model_config(self) -> ModelConfiguration:
        """Get model configuration for supervisor calls, preferably from available agents."""
        try:
            if self._agents:
                first_agent = self._agents[0]
                if first_agent and first_agent.model_config:
                    return first_agent.model_config
        except Exception:
            pass
        
        return ModelConfiguration(
            provider="ollama",
            model_name="gemma2:2b"
        )
    
    def _get_fallback_agent(self) -> str:
        """Get fallback agent when supervisor decision fails."""
        return self._agents[0].agent_id if self._agents else None