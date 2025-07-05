import os
from typing import Dict, List, Optional
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_ollama import ChatOllama
from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel

from .model_fetchers import (
    fetch_gemini_models_async,
    fetch_groq_models_async,
    fetch_openai_models_async,
    fetch_openrouter_models_async,
)
from ...core.config import settings


class LangChainModelService:
    """LangChain-based model service replacing Pydantic AI"""

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
        'vertex_ai': {
            'models': ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
            'requires_api_key': False,  # Uses service account or ADC
            'base_url_required': False
        },
        'chatsparty': {
            'models': ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
            'requires_api_key': True,
            'base_url_required': False
        }
    }

    def __init__(self):
        self._models = {}
        self._initialized = False

    async def initialize(self):
        """Async initialization method to fetch dynamic models"""
        if self._initialized:
            return
            
        # Fetch models from various providers
        await self._fetch_provider_models()
        self._initialized = True

    async def _fetch_provider_models(self):
        """Fetch models from external providers"""
        # OpenRouter
        openrouter_api_key = os.getenv('OPENROUTER_API_KEY')
        if openrouter_api_key:
            try:
                models = await fetch_openrouter_models_async(openrouter_api_key)
                if models:
                    self.SUPPORTED_PROVIDERS['openrouter']['models'] = models
            except Exception as e:
                print(f"Error fetching OpenRouter models: {e}")

        # Groq
        groq_api_key = os.getenv('GROQ_API_KEY')
        if groq_api_key:
            try:
                models = await fetch_groq_models_async(groq_api_key)
                if models:
                    self.SUPPORTED_PROVIDERS['groq']['models'] = models
            except Exception as e:
                print(f"Error fetching Groq models: {e}")

        # OpenAI
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if openai_api_key:
            try:
                models = await fetch_openai_models_async(openai_api_key)
                if models:
                    self.SUPPORTED_PROVIDERS['openai']['models'] = models
            except Exception as e:
                print(f"Error fetching OpenAI models: {e}")

        # Gemini
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if gemini_api_key:
            try:
                models = await fetch_gemini_models_async(gemini_api_key)
                if models:
                    self.SUPPORTED_PROVIDERS['gemini']['models'] = models
            except Exception as e:
                print(f"Error fetching Gemini models: {e}")

    def get_available_providers(self) -> Dict[str, Dict]:
        """Get all available providers and their models"""
        return self.SUPPORTED_PROVIDERS.copy()

    def get_models_for_provider(self, provider: str) -> List[str]:
        """Get available models for a specific provider"""
        return self.SUPPORTED_PROVIDERS.get(provider, {}).get('models', [])

    def create_model(self, provider: str, model_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> BaseChatModel:
        """Create a LangChain model instance for the given provider and model"""
        try:
            if provider == 'ollama':
                base_url = base_url or 'http://localhost:11434'
                return ChatOllama(
                    model=model_name,
                    base_url=base_url,
                    temperature=0.7
                )

            elif provider == 'openai':
                if not api_key:
                    api_key = os.getenv('OPENAI_API_KEY')
                if not api_key:
                    raise ValueError("OpenAI API key is required")
                
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    model=model_name,
                    api_key=api_key,
                    temperature=0.7
                )

            elif provider == 'anthropic':
                if not api_key:
                    api_key = os.getenv('ANTHROPIC_API_KEY')
                if not api_key:
                    raise ValueError("Anthropic API key is required")
                
                from langchain_anthropic import ChatAnthropic
                return ChatAnthropic(
                    model=model_name,
                    api_key=api_key,
                    temperature=0.7
                )

            elif provider == 'gemini':
                if not api_key:
                    api_key = os.getenv('GEMINI_API_KEY')
                if not api_key:
                    raise ValueError("Gemini API key is required")
                
                from langchain_google_genai import ChatGoogleGenerativeAI
                
                # Handle model name formatting for LangChain
                langchain_model_name = model_name
                if not model_name.startswith('models/'):
                    langchain_model_name = f"models/{model_name}"
                
                return ChatGoogleGenerativeAI(
                    model=langchain_model_name,
                    google_api_key=api_key,
                    temperature=0.7,
                    max_retries=2
                )

            elif provider == 'groq':
                if not api_key:
                    api_key = os.getenv('GROQ_API_KEY')
                if not api_key:
                    raise ValueError("Groq API key is required")
                
                from langchain_groq import ChatGroq
                return ChatGroq(
                    model=model_name,
                    api_key=api_key,
                    temperature=0.7
                )

            elif provider == 'vertex_ai':
                # Vertex AI using Google Cloud credentials
                from langchain_google_vertexai import ChatVertexAI
                
                # Get project ID from settings or environment
                project_id = (settings.google_cloud_project or 
                             os.getenv('GOOGLE_CLOUD_PROJECT') or 
                             os.getenv('VERTEX_AI_PROJECT'))
                location = settings.vertex_ai_location or os.getenv('VERTEX_AI_LOCATION', 'us-central1')
                
                if not project_id:
                    raise ValueError("GOOGLE_CLOUD_PROJECT or VERTEX_AI_PROJECT environment variable is required for Vertex AI")
                
                return ChatVertexAI(
                    model=model_name,
                    project=project_id,
                    location=location,
                    temperature=0.7,
                    max_retries=2,
                    max_output_tokens=2048,  # Ensure sufficient output tokens
                    top_p=0.95  # Add some randomness to avoid empty responses
                )

            elif provider == 'chatsparty':
                # ChatsParty now uses Vertex AI for better rate limits
                print(f"🔄 ChatsParty provider now using Vertex AI backend for better reliability")
                
                from langchain_google_vertexai import ChatVertexAI
                
                # Get project ID from settings or environment
                project_id = (settings.google_cloud_project or 
                             os.getenv('GOOGLE_CLOUD_PROJECT') or 
                             os.getenv('VERTEX_AI_PROJECT'))
                location = settings.vertex_ai_location or os.getenv('VERTEX_AI_LOCATION', 'us-central1')
                
                if not project_id:
                    # Fallback to direct Gemini API if Vertex AI not configured
                    print(f"⚠️  Vertex AI not configured, falling back to direct Gemini API")
                    if not api_key:
                        api_key = settings.chatsparty_default_api_key or settings.gemini_api_key or os.getenv('GEMINI_API_KEY')
                    if not api_key:
                        raise ValueError("Either Vertex AI project or Gemini API key is required for ChatsParty")
                    
                    from langchain_google_genai import ChatGoogleGenerativeAI
                    
                    # Handle model name formatting for LangChain
                    langchain_model_name = model_name
                    if not model_name.startswith('models/'):
                        langchain_model_name = f"models/{model_name}"
                    
                    return ChatGoogleGenerativeAI(
                        model=langchain_model_name,
                        google_api_key=api_key,
                        temperature=0.7,
                        max_retries=2
                    )
                else:
                    # Use Vertex AI for better rate limits
                    print(f"🚀 Creating Vertex AI model: {model_name} in project {project_id}, location {location}")
                    
                    return ChatVertexAI(
                        model=model_name,
                        project=project_id,
                        location=location,
                        temperature=0.7,
                        max_retries=2,
                        max_output_tokens=2048,  # Ensure sufficient output tokens
                        top_p=0.95  # Add some randomness to avoid empty responses
                    )

            else:
                raise ValueError(f"Unsupported provider: {provider}")

        except Exception as e:
            print(f"Error creating model {provider}:{model_name}: {e}")
            raise

    async def chat_completion(self, messages: List[Dict[str, str]], system_prompt: str,
                              provider: str, model_name: str, api_key: Optional[str] = None,
                              base_url: Optional[str] = None) -> str:
        """Generate a chat completion using structured output"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"🚀 Starting chat completion - Provider: {provider}, Model: {model_name}")
            
            model = self.create_model(provider, model_name, api_key, base_url)
            output_parser = StrOutputParser()
            
            # Create chain with structured output
            chain = model | output_parser
            
            # Convert messages to LangChain format
            langchain_messages = []
            
            if system_prompt:
                langchain_messages.append(SystemMessage(content=system_prompt))
            
            for message in messages:
                role = message.get("role", "user")
                content = message.get("content", "")
                
                if role == "user":
                    langchain_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    langchain_messages.append(AIMessage(content=content))
            
            # Generate response with structured output
            response = await chain.ainvoke(langchain_messages)
            
            # Validate response
            if not response or not response.strip():
                logger.warning(f"Empty response from {provider}:{model_name}, returning fallback")
                return "I'm experiencing some technical difficulties right now. Please try again."
            
            logger.info(f"✅ Response received: {len(response)} characters")
            return response.strip()

        except Exception as e:
            logger.error(f"❌ Error in chat completion for {provider}:{model_name}: {str(e)}")
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


_langchain_service = None


def get_langchain_model_service() -> LangChainModelService:
    """Get the singleton LangChain model service"""
    global _langchain_service
    if _langchain_service is None:
        _langchain_service = LangChainModelService()
    return _langchain_service


async def get_initialized_langchain_model_service() -> LangChainModelService:
    """Get the singleton LangChain model service with async initialization"""
    global _langchain_service
    if _langchain_service is None:
        _langchain_service = LangChainModelService()
    await _langchain_service.initialize()
    return _langchain_service