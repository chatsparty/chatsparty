from pydantic_ai import Agent as PydanticAgent
from typing import List, Dict, Optional, Union
import os
import asyncio


class UnifiedModelService:
    """Unified service for all AI models using Pydantic AI"""
    
    SUPPORTED_PROVIDERS = {
        'ollama': {
            'models': ['gemma3:4b', 'gemma2:2b', 'gemma2:9b', 'llama3.1:8b', 'llama3.1:70b', 'mistral:7b', 'codellama:7b'],
            'requires_api_key': False,
            'base_url_required': True
        },
        'openai': {
            'models': ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
            'requires_api_key': True,
            'base_url_required': False
        },
        'anthropic': {
            'models': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
            'requires_api_key': True,
            'base_url_required': False
        },
        'gemini': {
            'models': ['gemini-2.5-pro-preview-06-05', 'gemini-2.5-pro-preview-05-06', 'gemini-2.5-flash-preview-05-20', 'gemini-2.5-flash-preview-04-17'],
            'requires_api_key': True,
            'base_url_required': False
        },
        'groq': {
            'models': ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
            'requires_api_key': True,
            'base_url_required': False
        }
    }
    
    def __init__(self):
        self._agents = {}
        self._models = {}
    
    def get_available_providers(self) -> Dict[str, Dict]:
        """Get all available providers and their models"""
        return self.SUPPORTED_PROVIDERS
    
    def get_models_for_provider(self, provider: str) -> List[str]:
        """Get available models for a specific provider"""
        return self.SUPPORTED_PROVIDERS.get(provider, {}).get('models', [])
    
    def create_model(self, provider: str, model_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> str:
        """Create a model instance for the given provider and model"""
        try:
            if provider == 'ollama':
                # For Ollama, use the base_url or default to localhost
                base_url = base_url or 'http://localhost:11434'
                return f'ollama:{model_name}'
            
            elif provider == 'openai':
                if not api_key:
                    api_key = os.getenv('OPENAI_API_KEY')
                if not api_key:
                    raise ValueError("OpenAI API key is required")
                os.environ['OPENAI_API_KEY'] = api_key
                return f'openai:{model_name}'
            
            elif provider == 'anthropic':
                if not api_key:
                    api_key = os.getenv('ANTHROPIC_API_KEY')
                if not api_key:
                    raise ValueError("Anthropic API key is required")
                os.environ['ANTHROPIC_API_KEY'] = api_key
                return f'anthropic:{model_name}'
            
            elif provider == 'gemini':
                if not api_key:
                    api_key = os.getenv('GEMINI_API_KEY')
                if not api_key:
                    raise ValueError("Gemini API key is required")
                os.environ['GOOGLE_API_KEY'] = api_key
                return f'google-gla:{model_name}'
            
            elif provider == 'groq':
                if not api_key:
                    api_key = os.getenv('GROQ_API_KEY')
                if not api_key:
                    raise ValueError("Groq API key is required")
                os.environ['GROQ_API_KEY'] = api_key
                return f'groq:{model_name}'
            
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            print(f"Error creating model {provider}:{model_name}: {e}")
            raise
    
    def get_agent(self, agent_id: str, system_prompt: str, provider: str, model_name: str, 
                  api_key: Optional[str] = None, base_url: Optional[str] = None) -> PydanticAgent:
        """Get or create a Pydantic AI agent"""
        agent_key = f"{agent_id}_{provider}_{model_name}"
        
        if agent_key not in self._agents:
            try:
                model = self.create_model(provider, model_name, api_key, base_url)
                agent = PydanticAgent(model=model, system_prompt=system_prompt)
                self._agents[agent_key] = agent
            except Exception as e:
                print(f"Error creating agent {agent_id}: {e}")
                raise
        
        return self._agents[agent_key]
    
    async def chat_completion(self, messages: List[Dict[str, str]], system_prompt: str,
                            provider: str, model_name: str, api_key: Optional[str] = None,
                            base_url: Optional[str] = None) -> str:
        """Generate a chat completion using the specified model"""
        try:
            # Create temporary agent for this completion
            model = self.create_model(provider, model_name, api_key, base_url)
            agent = PydanticAgent(model=model, system_prompt=system_prompt)
            
            # Convert messages to conversation
            conversation_text = ""
            for message in messages:
                role = message.get("role", "user")
                content = message.get("content", "")
                
                if role == "user":
                    conversation_text += f"{content}\n"
                elif role == "assistant":
                    conversation_text += f"Assistant: {content}\n"
            
            # Run the agent
            result = await agent.run(conversation_text)
            return result.data
            
        except Exception as e:
            print(f"Error in chat completion: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    def validate_model_config(self, provider: str, model_name: str, api_key: Optional[str] = None) -> bool:
        """Validate if a model configuration is valid"""
        try:
            if provider not in self.SUPPORTED_PROVIDERS:
                return False
            
            provider_info = self.SUPPORTED_PROVIDERS[provider]
            
            if model_name not in provider_info['models']:
                return False
            
            if provider_info['requires_api_key'] and not api_key:
                # Check environment variables
                env_key = f"{provider.upper()}_API_KEY"
                if not os.getenv(env_key):
                    return False
            
            return True
            
        except Exception:
            return False


_unified_service = None


def get_unified_model_service() -> UnifiedModelService:
    """Get the singleton unified model service"""
    global _unified_service
    if _unified_service is None:
        _unified_service = UnifiedModelService()
    return _unified_service