import ollama
import os
from typing import List


class ModelService:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("OLLAMA_MODEL", "gemma3:4b")
        self.client = ollama.Client()

    def ensure_model_available(self):
        """Check if the model is available locally, pull if needed"""
        try:
            models = self.client.list()
            model_names = []
            
            # Handle different response structures
            if isinstance(models, dict) and 'models' in models:
                model_names = [model.get('name', '') for model in models['models']]
            elif hasattr(models, 'models'):
                model_names = [model.name for model in models.models]
            
            if self.model_name not in model_names:
                print(f"Model {self.model_name} not found locally. Pulling...")
                self.client.pull(self.model_name)
                print(f"Successfully pulled {self.model_name}")
            else:
                print(f"Model {self.model_name} is already available")
                
        except Exception as e:
            print(f"Error checking models: {e}")
            # Try to pull anyway
            try:
                print(f"Attempting to pull {self.model_name}...")
                self.client.pull(self.model_name)
                print(f"Successfully pulled {self.model_name}")
            except Exception as pull_error:
                print(f"Failed to pull model {self.model_name}: {pull_error}")

    def list_available_models(self) -> List[str]:
        """List all available models"""
        try:
            models = self.client.list()
            model_names = []
            
            if isinstance(models, dict) and 'models' in models:
                model_names = [model.get('name', '') for model in models['models']]
            elif hasattr(models, 'models'):
                model_names = [model.name for model in models.models]
            
            return model_names
        except Exception as e:
            print(f"Error listing models: {e}")
            return []

    def is_model_available(self, model_name: str = None) -> bool:
        """Check if a specific model is available"""
        target_model = model_name or self.model_name
        available_models = self.list_available_models()
        return target_model in available_models


_model_service = None


def get_model_service() -> ModelService:
    global _model_service
    if _model_service is None:
        _model_service = ModelService()
    return _model_service