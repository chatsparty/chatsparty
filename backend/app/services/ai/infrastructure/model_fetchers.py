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
    url = "https://api.openrouter.ai/v1/models" # Standard OpenRouter API endpoint

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
