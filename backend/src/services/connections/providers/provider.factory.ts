import { AIProvider } from '../connection.types';
import { AnthropicProvider } from './anthropic.provider';
import { GoogleProvider } from './google.provider';
import { GroqProvider } from './groq.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';
import { IProvider } from './provider.interface';
import { VertexAIProvider } from './vertex-ai.provider';

export class ProviderFactory {
  private static providerMap: Record<AIProvider, new () => IProvider> = {
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    google: GoogleProvider,
    groq: GroqProvider,
    ollama: OllamaProvider,
    vertex_ai: VertexAIProvider,
  };

  static createProvider(provider: AIProvider): IProvider {
    const ProviderClass = this.providerMap[provider];
    if (!ProviderClass) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    return new ProviderClass();
  }
}