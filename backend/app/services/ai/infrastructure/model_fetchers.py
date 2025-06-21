import httpx
import os
from typing import List
import asyncio # Keep asyncio for asyncio.run if used directly, or for type hints

# Consider adding a logger for better debugging in the future
# import logging
# logger = logging.getLogger(__name__)

async def fetch_openrouter_models_async(api_key: str) -> List[str]:
    if not api_key:
        # This check might be redundant if the caller always ensures api_key is present
        # but good for a standalone utility function.
        print("Error: OpenRouter API key not provided for fetching models.")
        return []

    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    url = "https://openrouter.ai/api/v1/models" # Standard OpenRouter API endpoint

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            data = response.json()
            if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                for model_info in data["data"]:
                    if isinstance(model_info, dict) and "id" in model_info:
                        models.append(model_info["id"])
            else:
                print(f"Unexpected response structure from OpenRouter: {data}")
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching OpenRouter models: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error fetching OpenRouter models: {e}")
    except Exception as e:
        print(f"An unexpected error occurred fetching OpenRouter models: {e}")

    return models


async def fetch_groq_models_async(api_key: str) -> List[str]:
    """Fetch available models from Groq API"""
    if not api_key:
        print("Error: Groq API key not provided for fetching models.")
        return []

    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    url = "https://api.groq.com/openai/v1/models"

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            data = response.json()
            if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                for model_info in data["data"]:
                    if isinstance(model_info, dict) and "id" in model_info:
                        models.append(model_info["id"])
            else:
                print(f"Unexpected response structure from Groq: {data}")
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching Groq models: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error fetching Groq models: {e}")
    except Exception as e:
        print(f"An unexpected error occurred fetching Groq models: {e}")

    return models


async def fetch_openai_models_async(api_key: str) -> List[str]:
    """Fetch available models from OpenAI API"""
    if not api_key:
        print("Error: OpenAI API key not provided for fetching models.")
        return []

    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    url = "https://api.openai.com/v1/models"

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            data = response.json()
            if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                for model_info in data["data"]:
                    if isinstance(model_info, dict) and "id" in model_info:
                        models.append(model_info["id"])
            else:
                print(f"Unexpected response structure from OpenAI: {data}")
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching OpenAI models: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error fetching OpenAI models: {e}")
    except Exception as e:
        print(f"An unexpected error occurred fetching OpenAI models: {e}")

    return models


async def fetch_gemini_models_async(api_key: str) -> List[str]:
    """Fetch available models from Google Gemini API"""
    if not api_key:
        print("Error: Gemini API key not provided for fetching models.")
        return []

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()

            data = response.json()
            if isinstance(data, dict) and "models" in data and isinstance(data["models"], list):
                for model_info in data["models"]:
                    if isinstance(model_info, dict) and "name" in model_info:
                        model_name = model_info["name"]
                        if model_name.startswith("models/"):
                            model_name = model_name[7:]
                        models.append(model_name)
            else:
                print(f"Unexpected response structure from Gemini: {data}")
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching Gemini models: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error fetching Gemini models: {e}")
    except Exception as e:
        print(f"An unexpected error occurred fetching Gemini models: {e}")

    return models
