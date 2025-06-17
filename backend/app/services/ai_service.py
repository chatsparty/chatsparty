import ollama
from typing import Dict, List, Any, Optional
import json
import asyncio
import os
from functools import wraps
from .model_service import get_model_service

class Agent:
    def __init__(self, agent_id: str, name: str, prompt: str, characteristics: str, model_name: str = None, chat_style: dict = None):
        self.agent_id = agent_id
        self.name = name
        self.prompt = prompt
        self.characteristics = characteristics
        self.model_name = model_name
        self.chat_style = chat_style or {
            "friendliness": "friendly",  # friendly, neutral, formal
            "response_length": "medium",  # short, medium, long
            "personality": "balanced",   # enthusiastic, balanced, reserved
            "humor": "light",           # none, light, witty
            "expertise_level": "expert" # beginner, intermediate, expert
        }
        self.conversation_history = []
    
    def get_system_prompt(self) -> str:
        # Build style instructions
        style_instructions = []
        
        # Friendliness
        if self.chat_style["friendliness"] == "friendly":
            style_instructions.append("Be warm, approachable, and friendly in your responses.")
        elif self.chat_style["friendliness"] == "formal":
            style_instructions.append("Maintain a professional and formal tone.")
        else:  # neutral
            style_instructions.append("Use a balanced, neither too casual nor too formal tone.")
        
        # Response length
        if self.chat_style["response_length"] == "short":
            style_instructions.append("Keep your responses brief and concise (1-2 sentences when possible).")
        elif self.chat_style["response_length"] == "long":
            style_instructions.append("Provide detailed, comprehensive responses with explanations.")
        else:  # medium
            style_instructions.append("Keep responses moderate in length - informative but not overly long.")
        
        # Personality
        if self.chat_style["personality"] == "enthusiastic":
            style_instructions.append("Show enthusiasm and energy in your responses.")
        elif self.chat_style["personality"] == "reserved":
            style_instructions.append("Be thoughtful and measured in your responses.")
        else:  # balanced
            style_instructions.append("Maintain a balanced, engaging but not overwhelming personality.")
        
        # Humor
        if self.chat_style["humor"] == "witty":
            style_instructions.append("Feel free to include appropriate humor and wit.")
        elif self.chat_style["humor"] == "light":
            style_instructions.append("Occasionally use light humor when appropriate.")
        else:  # none
            style_instructions.append("Keep responses serious and focused.")
        
        # Expertise level
        if self.chat_style["expertise_level"] == "beginner":
            style_instructions.append("Explain concepts simply, as if speaking to a beginner.")
        elif self.chat_style["expertise_level"] == "intermediate":
            style_instructions.append("Use moderate technical language appropriate for someone with some experience.")
        else:  # expert
            style_instructions.append("You can use technical language and assume advanced knowledge.")
        
        style_text = " ".join(style_instructions)
        
        return f"""You are {self.name}. 

Your role and characteristics: {self.characteristics}

Your specific instructions: {self.prompt}

Communication style: {style_text}

Please respond in character according to your role, characteristics, and communication style."""

class AIService:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("OLLAMA_MODEL", "gemma3:4b")
        self.client = ollama.Client()
        self.model_service = get_model_service()
        self.model_service.ensure_model_available()
        self.agents = {}
        self.conversations = {}
    
    async def chat_completion(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None, model_name: Optional[str] = None) -> str:
        """Generate a chat completion using the local model"""
        try:
            # Prepare messages for Ollama
            formatted_messages = []
            
            if system_prompt:
                formatted_messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            formatted_messages.extend(messages)
            
            # Make async call to Ollama
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat(
                    model=model_name or self.model_name,
                    messages=formatted_messages
                )
            )
            
            return response['message']['content']
        
        except Exception as e:
            print(f"Error in chat completion: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    def create_agent(self, agent_id: str, name: str, prompt: str, characteristics: str, model_name: str = None, chat_style: dict = None) -> Agent:
        """Create a new agent with specific characteristics and prompt"""
        agent = Agent(agent_id, name, prompt, characteristics, model_name, chat_style)
        self.agents[agent_id] = agent
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an agent by ID"""
        return self.agents.get(agent_id)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        """List all available agents"""
        return [
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "prompt": agent.prompt,
                "characteristics": agent.characteristics,
                "chat_style": agent.chat_style
            }
            for agent in self.agents.values()
        ]
    
    async def agent_chat(self, agent_id: str, message: str, conversation_id: str = "default") -> str:
        """Have a specific agent respond to a message"""
        agent = self.get_agent(agent_id)
        if not agent:
            return f"Agent {agent_id} not found"
        
        # Initialize conversation if it doesn't exist
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        # Add user message to conversation
        self.conversations[conversation_id].append({
            "role": "user",
            "content": message
        })
        
        # Get agent response
        response = await self.chat_completion(
            self.conversations[conversation_id],
            agent.get_system_prompt(),
            agent.model_name
        )
        
        # Add agent response to conversation
        self.conversations[conversation_id].append({
            "role": "assistant", 
            "content": response
        })
        
        return response
    
    async def multi_agent_conversation(self, conversation_id: str, agent_ids: List[str], initial_message: str, max_turns: int = 10) -> List[Dict[str, Any]]:
        """Start a conversation between multiple agents"""
        if len(agent_ids) < 2:
            return [{"error": "At least 2 agents are required for a conversation"}]
        
        # Verify all agents exist
        for agent_id in agent_ids:
            if agent_id not in self.agents:
                return [{"error": f"Agent {agent_id} not found"}]
        
        conversation_log = []
        current_message = initial_message
        
        # Initialize conversation
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        # Add initial message to log
        conversation_log.append({
            "speaker": "user",
            "message": initial_message,
            "timestamp": asyncio.get_event_loop().time()
        })
        
        current_agent_index = 0
        
        for turn in range(max_turns):
            current_agent_id = agent_ids[current_agent_index]
            current_agent = self.agents[current_agent_id]
            
            # Create context for the agent including recent conversation
            context_messages = []
            if len(conversation_log) > 1:  # More than just the initial message
                # Include recent messages as context
                recent_messages = conversation_log[-5:]  # Last 5 messages
                context = "Recent conversation:\n"
                for msg in recent_messages:
                    context += f"{msg['speaker']}: {msg['message']}\n"
                context += f"\nPlease continue the conversation naturally from your perspective."
                context_messages = [{"role": "user", "content": context}]
            else:
                # First turn, respond to initial message
                context_messages = [{"role": "user", "content": current_message}]
            
            # Get agent response
            response = await self.chat_completion(
                context_messages,
                current_agent.get_system_prompt(),
                current_agent.model_name
            )
            
            # Add to conversation log
            conversation_log.append({
                "speaker": current_agent.name,
                "agent_id": current_agent_id,
                "message": response,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Move to next agent
            current_agent_index = (current_agent_index + 1) % len(agent_ids)
            
            # Check if conversation should end (simple heuristic)
            if "goodbye" in response.lower() or "end conversation" in response.lower():
                break
        
        return conversation_log

    async def multi_agent_conversation_stream(self, conversation_id: str, agent_ids: List[str], initial_message: str, max_turns: int = 10):
        """Stream a conversation between multiple agents in real-time"""
        if len(agent_ids) < 2:
            yield {"error": "At least 2 agents are required for a conversation"}
            return
        
        # Verify all agents exist
        for agent_id in agent_ids:
            if agent_id not in self.agents:
                yield {"error": f"Agent {agent_id} not found"}
                return
        
        conversation_log = []
        current_message = initial_message
        
        # Initialize conversation
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        # Send initial message
        initial_msg = {
            "speaker": "user",
            "message": initial_message,
            "timestamp": asyncio.get_event_loop().time(),
            "type": "message"
        }
        conversation_log.append(initial_msg)
        yield initial_msg
        
        current_agent_index = 0
        
        for turn in range(max_turns):
            current_agent_id = agent_ids[current_agent_index]
            current_agent = self.agents[current_agent_id]
            
            # Send "typing" indicator
            yield {
                "type": "typing",
                "speaker": current_agent.name,
                "agent_id": current_agent_id
            }
            
            # Create context for the agent including recent conversation
            context_messages = []
            if len(conversation_log) > 1:  # More than just the initial message
                # Include recent messages as context
                recent_messages = conversation_log[-5:]  # Last 5 messages
                context = "Recent conversation:\n"
                for msg in recent_messages:
                    if msg.get("type") == "message":
                        context += f"{msg['speaker']}: {msg['message']}\n"
                context += f"\nPlease continue the conversation naturally from your perspective."
                context_messages = [{"role": "user", "content": context}]
            else:
                # First turn, respond to initial message
                context_messages = [{"role": "user", "content": current_message}]
            
            # Get agent response
            response = await self.chat_completion(
                context_messages,
                current_agent.get_system_prompt(),
                current_agent.model_name
            )
            
            # Send the agent's message
            agent_msg = {
                "speaker": current_agent.name,
                "agent_id": current_agent_id,
                "message": response,
                "timestamp": asyncio.get_event_loop().time(),
                "type": "message"
            }
            conversation_log.append(agent_msg)
            yield agent_msg
            
            # Move to next agent
            current_agent_index = (current_agent_index + 1) % len(agent_ids)
            
            # Check if conversation should end (simple heuristic)
            if "goodbye" in response.lower() or "end conversation" in response.lower():
                break
            
            # Add a small delay between messages for better UX
            await asyncio.sleep(1)
    
    def get_conversation_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get the history of a conversation"""
        return self.conversations.get(conversation_id, [])

_ai_service = None


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service