import asyncio
import os
from typing import Dict, List, Optional

from pydantic_ai import Agent as PydanticAgent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

from .model_fetchers import (
    fetch_gemini_models_async,
    fetch_groq_models_async,
    fetch_openai_models_async,
    fetch_openrouter_models_async,
)


class UnifiedModelService:
    """Unified service for all AI models using Pydantic AI"""

    SUPPORTED_PROVIDERS = {
        'ollama': {
            'models': ['gemma3:4b', 'gemma2:2b', 'gemma2:9b', 'llama3.1:8b', 'llama3.1:70b', 'mistral:7b', 'codellama:7b'],
            'requires_api_key': False,
            'base_url_required': True
        },
        'openai': {
            'models': [],
            'requires_api_key': True,
            'base_url_required': False
        },
        'anthropic': {
            'models': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
            'requires_api_key': True,
            'base_url_required': False
        },
        'gemini': {
            'models': [],
            'requires_api_key': True,
            'base_url_required': False
        },
        'groq': {
            'models': [],
            'requires_api_key': True,
            'base_url_required': False
        },
        'openrouter': {
            'models': [],
            'requires_api_key': True,
            'base_url_required': False
        },
        'mcp': {
            'models': [],
            'requires_api_key': False,
            'base_url_required': True,
            'supports_tools': True,
            'supports_resources': True,
            'connection_type': 'mcp_server'
        }
    }

    def __init__(self):
        self._agents = {}
        self._models = {}

        openrouter_api_key = os.getenv('OPENROUTER_API_KEY')
        if openrouter_api_key:
            print("Attempting to fetch OpenRouter models...")
            try:
                models = asyncio.run(
                    fetch_openrouter_models_async(openrouter_api_key))
                if models:
                    type(
                        self).SUPPORTED_PROVIDERS['openrouter']['models'] = models
                    print(
                        f"Successfully fetched {len(models)} OpenRouter models.")
                else:
                    print(
                        "No models returned from OpenRouter or API key was missing for fetch method.")
            except RuntimeError as e:
                if "cannot be called when another loop is running" in str(e):
                    print(
                        f"Warning: Could not fetch OpenRouter models during init due to existing event loop: {e}")
                    print(
                        "Consider calling an async initialization method for UnifiedModelService if models are needed at startup in an async context.")
                else:
                    print(f"Error fetching OpenRouter models during init: {e}")
            except Exception as e:
                print(
                    f"An unexpected error occurred while fetching OpenRouter models during init: {e}")
        else:
            print(
                "OPENROUTER_API_KEY not found in environment. Skipping dynamic OpenRouter model fetching.")

        groq_api_key = os.getenv('GROQ_API_KEY')
        if groq_api_key:
            print("Attempting to fetch Groq models...")
            try:
                models = asyncio.run(fetch_groq_models_async(groq_api_key))
                if models:
                    type(self).SUPPORTED_PROVIDERS['groq']['models'] = models
                    print(f"Successfully fetched {len(models)} Groq models.")
                else:
                    print(
                        "No models returned from Groq or API key was missing for fetch method.")
            except RuntimeError as e:
                if "cannot be called when another loop is running" in str(e):
                    print(
                        f"Warning: Could not fetch Groq models during init due to existing event loop: {e}")
                    print(
                        "Consider calling an async initialization method for UnifiedModelService if models are needed at startup in an async context.")
                else:
                    print(f"Error fetching Groq models during init: {e}")
            except Exception as e:
                print(
                    f"An unexpected error occurred while fetching Groq models during init: {e}")
        else:
            print(
                "GROQ_API_KEY not found in environment. Skipping dynamic Groq model fetching.")

        openai_api_key = os.getenv('OPENAI_API_KEY')
        if openai_api_key:
            print("Attempting to fetch OpenAI models...")
            try:
                models = asyncio.run(fetch_openai_models_async(openai_api_key))
                if models:
                    type(self).SUPPORTED_PROVIDERS['openai']['models'] = models
                    print(f"Successfully fetched {len(models)} OpenAI models.")
                else:
                    print(
                        "No models returned from OpenAI or API key was missing for fetch method.")
            except RuntimeError as e:
                if "cannot be called when another loop is running" in str(e):
                    print(
                        f"Warning: Could not fetch OpenAI models during init due to existing event loop: {e}")
                    print(
                        "Consider calling an async initialization method for UnifiedModelService if models are needed at startup in an async context.")
                else:
                    print(f"Error fetching OpenAI models during init: {e}")
            except Exception as e:
                print(
                    f"An unexpected error occurred while fetching OpenAI models during init: {e}")
        else:
            print(
                "OPENAI_API_KEY not found in environment. Skipping dynamic OpenAI model fetching.")

        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if gemini_api_key:
            print("Attempting to fetch Gemini models...")
            try:
                models = asyncio.run(fetch_gemini_models_async(gemini_api_key))
                if models:
                    type(self).SUPPORTED_PROVIDERS['gemini']['models'] = models
                    print(f"Successfully fetched {len(models)} Gemini models.")
                else:
                    print(
                        "No models returned from Gemini or API key was missing for fetch method.")
            except RuntimeError as e:
                if "cannot be called when another loop is running" in str(e):
                    print(
                        f"Warning: Could not fetch Gemini models during init due to existing event loop: {e}")
                    print(
                        "Consider calling an async initialization method for UnifiedModelService if models are needed at startup in an async context.")
                else:
                    print(f"Error fetching Gemini models during init: {e}")
            except Exception as e:
                print(
                    f"An unexpected error occurred while fetching Gemini models during init: {e}")
        else:
            print(
                "GEMINI_API_KEY not found in environment. Skipping dynamic Gemini model fetching.")

    def get_available_providers(self) -> Dict[str, Dict]:
        """Get all available providers and their models"""
        return self.SUPPORTED_PROVIDERS

    def get_models_for_provider(self, provider: str) -> List[str]:
        """Get available models for a specific provider"""
        return self.SUPPORTED_PROVIDERS.get(provider, {}).get('models', [])

    def create_model(self, provider: str, model_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """Create a model instance for the given provider and model"""
        try:
            if provider == 'ollama':
                base_url = base_url or 'http://localhost:11434'
                openai_compatible_url = f"{base_url}/v1" if not base_url.endswith(
                    '/v1') else base_url
                return OpenAIModel(
                    model_name=model_name,
                    provider=OpenAIProvider(base_url=openai_compatible_url)
                )

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

            elif provider == 'openrouter':
                if not api_key:
                    api_key = os.getenv('OPENROUTER_API_KEY')
                if not api_key:
                    raise ValueError("OpenRouter API key is required")
                os.environ['OPENROUTER_API_KEY'] = api_key
                return f'openrouter:{model_name}'

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
                model = self.create_model(
                    provider, model_name, api_key, base_url)
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
            model = self.create_model(provider, model_name, api_key, base_url)
            agent = PydanticAgent(model=model, system_prompt=system_prompt)

            conversation_text = ""
            for message in messages:
                role = message.get("role", "user")
                content = message.get("content", "")

                if role == "user":
                    conversation_text += f"{content}\n"
                elif role == "assistant":
                    conversation_text += f"Assistant: {content}\n"

            result = await agent.run(conversation_text)
            return result.output

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
