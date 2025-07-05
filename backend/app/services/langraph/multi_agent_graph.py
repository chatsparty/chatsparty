from typing import Dict, List, Any, Optional, AsyncGenerator, TypedDict
import logging
from datetime import datetime
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field

from ..ai_core.entities import Agent, Message, ConversationMessage
from ..ai_core.interfaces import ModelProviderInterface, AgentRepositoryInterface

logger = logging.getLogger(__name__)


class AgentSelection(BaseModel):
    """Structured output for agent selection"""
    agent_id: str = Field(description="The ID of the agent that should respond next")
    reasoning: str = Field(description="Brief explanation of why this agent was selected")


class TerminationDecision(BaseModel):
    """Structured output for termination decision"""
    should_terminate: bool = Field(description="Whether the conversation should end")
    reason: str = Field(description="Brief explanation of the decision")


class ConversationState(TypedDict):
    messages: List[Dict[str, Any]]
    agents: List[Dict[str, Any]]
    current_speaker: Optional[str]
    turn_count: int
    max_turns: int
    conversation_complete: bool
    user_id: Optional[str]
    conversation_id: str


class MultiAgentGraph:
    def __init__(
        self,
        agents: List[Agent],
        model_provider: ModelProviderInterface,
        max_turns: int = 10
    ):
        self.agents = agents
        self.model_provider = model_provider
        self.max_turns = max_turns
        self.memory = MemorySaver()
        self.graph = self._build_graph()
        
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(ConversationState)
        
        # Add nodes
        workflow.add_node("select_speaker", self._select_speaker_node)
        workflow.add_node("agent_response", self._agent_response_node)
        workflow.add_node("check_termination", self._check_termination_node)
        
        # Add edges
        workflow.add_edge(START, "select_speaker")
        workflow.add_edge("select_speaker", "agent_response")
        workflow.add_edge("agent_response", "check_termination")
        
        # Conditional edges
        workflow.add_conditional_edges(
            "check_termination",
            self._should_continue,
            {
                "continue": "select_speaker",
                "end": END
            }
        )
        
        return workflow.compile(checkpointer=self.memory)
    
    async def _select_speaker_node(self, state: ConversationState) -> ConversationState:
        """Select which agent should speak next"""
        try:
            logger.info(f"🎯 Speaker selection - Turn {state['turn_count']}/{state['max_turns']}")
            
            if state["turn_count"] >= state["max_turns"]:
                logger.info(f"🛑 Max turns reached, ending conversation")
                state["conversation_complete"] = True
                return state
            
            # Get recent conversation context
            recent_messages = state["messages"][-5:] if len(state["messages"]) > 5 else state["messages"]
            
            # Build selection prompt
            agents_info = [
                {
                    "id": agent["id"],
                    "name": agent["name"],
                    "description": agent["characteristics"],
                }
                for agent in state["agents"]
            ]
            
            logger.info(f"🤖 Available agents: {[a['name'] for a in agents_info]}")
            
            selection_prompt = self._build_selection_prompt(
                recent_messages, agents_info
            )
            
            # Use first agent's model config for supervisor decisions
            if state["agents"]:
                first_agent = next(
                    (agent for agent in self.agents if agent.agent_id == state["agents"][0]["id"]),
                    self.agents[0]
                )
                
                logger.info(f"🎬 Using supervisor with agent config: {first_agent.ai_config.provider}:{first_agent.ai_config.model_name}")
                
                # Use structured output for agent selection
                selected_agent = await self._select_agent_structured(
                    selection_prompt=selection_prompt,
                    available_agents=state["agents"],
                    model_config=first_agent.ai_config,
                    user_id=state["user_id"]
                )
                
                selected_agent_id = selected_agent.agent_id if selected_agent else state["agents"][0]["id"]
                logger.info(f"📋 Selected {selected_agent_id} because: {selected_agent.reasoning if selected_agent else 'fallback'}")
                
                # Anti-repetition fallback: if same agent selected consecutively, pick different one
                if selected_agent_id and len(state["messages"]) > 0:
                    last_speaker = None
                    for msg in reversed(state["messages"]):
                        if msg.get("role") == "assistant" and msg.get("agent_id"):
                            last_speaker = msg.get("agent_id")
                            break
                    
                    if selected_agent_id == last_speaker and len(state["agents"]) > 1:
                        logger.warning(f"🔄 Same agent ({selected_agent_id}) selected consecutively, forcing variety")
                        # Pick a different agent
                        for agent in state["agents"]:
                            if agent["id"] != last_speaker:
                                selected_agent_id = agent["id"]
                                logger.info(f"🔄 Forced selection: {selected_agent_id}")
                                break
                
                state["current_speaker"] = selected_agent_id or state["agents"][0]["id"]
                
                logger.info(f"✅ Selected speaker: {state['current_speaker']}")
            else:
                logger.warning("❌ No agents available, ending conversation")
                state["conversation_complete"] = True
                
        except Exception as e:
            logger.error(f"❌ Error in speaker selection: {e}")
            logger.error(f"🔍 Error type: {type(e).__name__}")
            state["current_speaker"] = state["agents"][0]["id"] if state["agents"] else None
            
        return state
    
    async def _agent_response_node(self, state: ConversationState) -> ConversationState:
        """Generate response from selected agent"""
        try:
            if not state["current_speaker"]:
                logger.warning("❌ No current speaker set, ending conversation")
                state["conversation_complete"] = True
                return state
            
            # Get the agent
            selected_agent = next(
                (agent for agent in self.agents if agent.agent_id == state["current_speaker"]),
                None
            )
            
            if not selected_agent:
                logger.error(f"❌ Agent {state['current_speaker']} not found, ending conversation")
                state["conversation_complete"] = True
                return state
            
            logger.info(f"💬 Generating response from {selected_agent.name} using {selected_agent.ai_config.provider}:{selected_agent.ai_config.model_name}")
            
            # Convert state messages to conversation history
            conversation_history = [
                Message(
                    role=msg["role"],
                    content=msg["content"],
                    speaker=msg.get("speaker", "user"),
                    agent_id=msg.get("agent_id")
                )
                for msg in state["messages"]
            ]
            
            logger.info(f"📜 Conversation history: {len(conversation_history)} messages")
            
            # Debug conversation context
            logger.info(f"🔍 Debug - Recent messages for {selected_agent.name}:")
            for i, msg in enumerate(conversation_history[-3:]):
                logger.info(f"  {i+1}. [{msg.speaker}] ({msg.role}): {msg.content[:100]}...")
            
            logger.info(f"🎯 Agent {selected_agent.name} system prompt preview: {selected_agent.get_system_prompt()[:200]}...")
            
            # Add delay for subsequent agents to avoid rate limiting
            import asyncio
            if state["turn_count"] > 0:  # Not the first agent response
                logger.info(f"⏱️  Adding delay to avoid rate limiting (turn {state['turn_count']})")
                # Exponential backoff: 2s for turn 1, 2.5s for turn 2, etc.
                delay = min(2.0 + (state["turn_count"] * 0.5), 5.0)
                await asyncio.sleep(delay)
            
            # Generate response
            response = await self.model_provider.chat_completion(
                conversation_history,
                selected_agent.get_system_prompt(),
                selected_agent.ai_config,
                user_id=state["user_id"]
            )
            
            # Add response to state
            timestamp = datetime.now().timestamp()
            response_message = {
                "role": "assistant",
                "content": response,
                "speaker": selected_agent.name,
                "agent_id": selected_agent.agent_id,
                "timestamp": timestamp
            }
            
            state["messages"].append(response_message)
            state["turn_count"] += 1
            
            logger.info(f"✅ Response generated: {len(response)} characters from {selected_agent.name}")
            
        except Exception as e:
            logger.error(f"❌ Error in agent response: {e}")
            logger.error(f"🔍 Error type: {type(e).__name__}")
            logger.error(f"🔍 Agent: {selected_agent.name if 'selected_agent' in locals() else 'Unknown'}")
            logger.error(f"🔍 Provider: {selected_agent.ai_config.provider if 'selected_agent' in locals() and selected_agent else 'Unknown'}")
            state["conversation_complete"] = True
            
        return state
    
    async def _check_termination_node(self, state: ConversationState) -> ConversationState:
        """Check if conversation should terminate"""
        try:
            if state["turn_count"] >= state["max_turns"]:
                state["conversation_complete"] = True
                return state
            
            # For greeting conversations, check termination after just 2 agent responses
            if len(state["messages"]) < 2:
                return state
            
            # Build termination check prompt
            recent_messages = state["messages"][-5:] if len(state["messages"]) > 5 else state["messages"]
            termination_prompt = self._build_termination_prompt(recent_messages)
            
            # Use first agent's model config
            if state["agents"]:
                first_agent = next(
                    (agent for agent in self.agents if agent.agent_id == state["agents"][0]["id"]),
                    self.agents[0]
                )
                
                # Use structured output for termination decision
                termination_decision = await self._check_termination_structured(
                    termination_prompt=termination_prompt,
                    model_config=first_agent.ai_config,
                    user_id=state["user_id"]
                )
                
                state["conversation_complete"] = termination_decision.should_terminate if termination_decision else False
                if termination_decision:
                    logger.info(f"🏁 Termination decision: {termination_decision.should_terminate} - {termination_decision.reason}")
                
        except Exception as e:
            logger.error(f"Error in termination check: {e}")
            logger.info(f"🏁 Termination decision: False - Continuing due to parsing error")
            # After a certain number of turns, terminate anyway to prevent infinite loops
            if state["turn_count"] >= min(5, state["max_turns"] // 2):
                logger.warning(f"🛑 Forcing termination after {state['turn_count']} turns due to repeated errors")
                state["conversation_complete"] = True
            
        return state
    
    def _should_continue(self, state: ConversationState) -> str:
        """Determine if conversation should continue"""
        if state["conversation_complete"] or state["turn_count"] >= state["max_turns"]:
            return "end"
        return "continue"
    
    def _build_selection_prompt(
        self,
        recent_messages: List[Dict[str, Any]],
        agents_info: List[Dict[str, str]]
    ) -> str:
        """Build prompt for agent selection"""
        conversation_context = ""
        for msg in recent_messages:
            speaker = msg.get("speaker", "User")
            conversation_context += f"{speaker}: {msg['content']}\n"
        
        agents_list = ""
        for agent in agents_info:
            agents_list += f"- {agent['id']}: {agent['name']} - {agent['description']}\n"
        
        last_speaker = recent_messages[-1].get("speaker", "unknown") if recent_messages else "unknown"
        
        # Get last few speakers to avoid repetition
        last_speakers = []
        for msg in recent_messages[-3:]:  # Look at last 3 messages
            if msg.get("role") == "assistant" and msg.get("speaker"):
                last_speakers.append(msg.get("speaker"))
        
        anti_repetition_note = ""
        if last_speakers:
            recent_speaker_names = ", ".join(set(last_speakers))
            anti_repetition_note = f"\nIMPORTANT ANTI-REPETITION RULE: The following agents have spoken recently: {recent_speaker_names}. You MUST select a DIFFERENT agent to ensure variety and natural conversation flow."

        return f"""
Available agents:
{agents_list}

Recent conversation:
{conversation_context}

Based on the conversation context and each agent's expertise, which agent should respond next?
Consider:
1. Which agent's expertise is most relevant to the current topic
2. Which agent hasn't spoken recently (for variety) - THIS IS CRITICAL
3. Which agent would provide the most valuable response
4. The selected agent should BUILD ON the current message, not repeat similar content

CRITICAL: The last message was from {last_speaker}. You MUST select a DIFFERENT agent to avoid repetition.{anti_repetition_note}
"""
    
    def _build_termination_prompt(self, recent_messages: List[Dict[str, Any]]) -> str:
        """Build prompt for termination decision"""
        conversation_context = ""
        for msg in recent_messages:
            speaker = msg.get("speaker", "User")
            conversation_context += f"{speaker}: {msg['content']}\n"
        
        return f"""
Recent conversation:
{conversation_context}

Has this conversation reached a natural conclusion? Consider:
1. Have the main topics been thoroughly discussed?
2. Are agents starting to repeat themselves?
3. Has the user's question/request been adequately addressed?
4. Are there clear ending signals in the recent messages?
"""
    
    def _get_supervisor_system_prompt(self) -> str:
        """System prompt for supervisor agent selection"""
        return """You are a conversation supervisor for a natural group chat. Your role is to decide who speaks next OR if the conversation should pause.

IMPORTANT GROUP CHAT DYNAMICS:
- After a simple greeting (Hello, Hi, Hey), usually 1-2 people respond with brief greetings, then conversation naturally pauses
- Not everyone needs to greet back - that would be unnatural
- If someone just said hello and 1-2 agents already greeted back, the conversation should pause
- Long introductions after "Hello" are awkward - keep it brief and natural
- Sometimes NO ONE should respond (natural silence is normal)

Consider:
- Has the greeting already been acknowledged? If yes, maybe no one else needs to respond
- Would this person naturally speak up in this moment?
- Is this becoming repetitive or forced?

For simple greetings: Maximum 2 agents should respond, then let it pause naturally."""
    
    def _get_termination_system_prompt(self) -> str:
        """System prompt for termination decisions"""
        return """You are a conversation supervisor analyzing whether a group chat should naturally pause.

CRITICAL RULES FOR GREETINGS:
- If user said "Hello/Hi/Hey" and 1-2 agents already responded with greetings, TERMINATE
- Simple greetings don't need everyone to respond - that's unnatural
- After brief greeting exchanges, conversations naturally pause until someone brings up a topic

Consider:
- Is this just a greeting exchange? If yes, and 2 agents responded, TERMINATE
- Are agents starting to repeat greetings? TERMINATE
- Is the conversation forced with no real topic? TERMINATE
- Natural pauses are GOOD - don't force conversation

Be aggressive about ending greeting-only conversations. Real group chats pause after "Hello" exchanges."""
    
    async def _select_agent_structured(
        self, 
        selection_prompt: str,
        available_agents: List[Dict[str, Any]],
        model_config: Any,
        user_id: Optional[str]
    ) -> Optional[AgentSelection]:
        """Select agent using structured output"""
        try:
            # Import here to avoid circular imports
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import PydanticOutputParser
            
            # Create parser
            parser = PydanticOutputParser(pydantic_object=AgentSelection)
            
            # Create prompt with format instructions
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", self._get_supervisor_system_prompt()),
                ("user", "{selection_prompt}\n\n{format_instructions}")
            ])
            
            # Format the prompt
            formatted_prompt = prompt_template.format_messages(
                selection_prompt=selection_prompt,
                format_instructions=parser.get_format_instructions()
            )
            
            # Create messages for the model provider
            messages = []
            for msg in formatted_prompt:
                if msg.type == "system":
                    # Skip system messages, we'll use it as system_prompt
                    continue
                messages.append(Message(role="user", content=msg.content))
            
            # Get response using the model provider
            response = await self.model_provider.chat_completion(
                messages=messages,
                system_prompt=self._get_supervisor_system_prompt(),
                model_config=model_config,
                user_id=user_id,
                is_supervisor_call=True
            )
            
            # Parse the response
            try:
                return parser.parse(response)
            except Exception as parse_error:
                logger.warning(f"Failed to parse response: {parse_error}")
                logger.warning(f"Raw response was: {response}")
                
                # If response contains technical difficulty message, use simple round-robin
                if "technical difficulties" in response.lower() or "error" in response.lower():
                    logger.warning("Model returned error message, using simple selection")
                    # Just pick a random agent to avoid the same one
                    import random
                    selected = random.choice(available_agents)
                    return AgentSelection(
                        agent_id=selected["id"],
                        reasoning="Random selection due to model error"
                    )
                
                # Default fallback
                return AgentSelection(
                    agent_id=available_agents[0]["id"],
                    reasoning="Fallback selection due to parsing error"
                )
            
        except Exception as e:
            logger.error(f"Error in structured agent selection: {e}")
            # Improved fallback: try to select a different agent than the last speaker
            if available_agents:
                # Get the last speaker from messages
                last_speaker_id = None
                for msg in reversed(self.agents):
                    if hasattr(msg, 'agent_id'):
                        last_speaker_id = msg.agent_id
                        break
                
                # Try to select a different agent
                for agent in available_agents:
                    if agent["id"] != last_speaker_id:
                        return AgentSelection(
                            agent_id=agent["id"],
                            reasoning="Fallback selection due to error"
                        )
                
                # If all else fails, use first agent
                return AgentSelection(
                    agent_id=available_agents[0]["id"],
                    reasoning="Fallback selection due to error"
                )
            return None
    
    async def _check_termination_structured(
        self,
        termination_prompt: str,
        model_config: Any,
        user_id: Optional[str]
    ) -> Optional[TerminationDecision]:
        """Check termination using structured output"""
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import PydanticOutputParser
            
            parser = PydanticOutputParser(pydantic_object=TerminationDecision)
            
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", self._get_termination_system_prompt()),
                ("user", "{termination_prompt}\n\n{format_instructions}")
            ])
            
            formatted_prompt = prompt_template.format_messages(
                termination_prompt=termination_prompt,
                format_instructions=parser.get_format_instructions()
            )
            
            # Create messages for the model provider
            messages = []
            for msg in formatted_prompt:
                if msg.type == "system":
                    continue
                messages.append(Message(role="user", content=msg.content))
            
            response = await self.model_provider.chat_completion(
                messages=messages,
                system_prompt=self._get_termination_system_prompt(),
                model_config=model_config,
                user_id=user_id,
                is_supervisor_call=True
            )
            
            return parser.parse(response)
            
        except Exception as e:
            logger.error(f"Error in structured termination check: {e}")
            return TerminationDecision(
                should_terminate=False,
                reason="Continuing due to parsing error"
            )
    
    async def run_conversation(
        self,
        conversation_id: str,
        initial_message: str,
        user_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run the multi-agent conversation"""
        try:
            # Initialize state
            initial_state: ConversationState = {
                "messages": [{
                    "role": "user",
                    "content": initial_message,
                    "speaker": "user",
                    "timestamp": datetime.now().timestamp()
                }],
                "agents": [{
                    "id": agent.agent_id,
                    "name": agent.name,
                    "characteristics": agent.characteristics
                } for agent in self.agents],
                "current_speaker": None,
                "turn_count": 0,
                "max_turns": self.max_turns,
                "conversation_complete": False,
                "user_id": user_id,
                "conversation_id": conversation_id
            }
            
            # Configure graph execution with recursion limit
            config = {
                "configurable": {
                    "thread_id": conversation_id,
                    "checkpoint_ns": user_id or "default"
                },
                "recursion_limit": self.max_turns * 3  # Allow 3 nodes per turn
            }
            
            # Stream graph execution
            async for state_update in self.graph.astream(initial_state, config):
                # state_update is a dict with node name as key
                for node_name, current_state in state_update.items():
                    # Yield updates based on state changes
                    if node_name == "agent_response":
                        if current_state["messages"]:
                            last_message = current_state["messages"][-1]
                            if last_message.get("role") == "assistant":
                                yield {
                                    "type": "agent_response",
                                    "agent_id": last_message.get("agent_id"),
                                    "agent_name": last_message.get("speaker"),
                                    "message": last_message.get("content"),
                                    "timestamp": last_message.get("timestamp")
                                }
                    
                    elif node_name == "check_termination":
                        if current_state["conversation_complete"]:
                            yield {
                                "type": "conversation_complete",
                                "message": "Conversation has reached a natural conclusion"
                            }
                            return
                        
        except Exception as e:
            logger.error(f"Error in conversation execution: {e}")
            yield {
                "type": "error",
                "message": f"Error in conversation: {str(e)}"
            }