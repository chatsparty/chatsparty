import { GoogleAuth } from 'google-auth-library';
import { ModelInfo } from '../../../routes/connections/connection.types';

export interface VertexAIConfig {
  projectId: string;
  location: string;
  apiKey?: string; // Can use API key or default credentials
  modelName: string;
}

export interface VertexAIMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface VertexAIResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
}

export class VertexAIProvider {
  private auth: GoogleAuth;
  private endpoint: string;

  constructor(private readonly config: VertexAIConfig) {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    this.endpoint = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.modelName}:generateContent`;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.generateContent([
        { role: 'user', parts: [{ text: 'Hello' }] },
      ]);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Vertex AI',
      };
    }
  }

  async generateContent(
    messages: VertexAIMessage[]
  ): Promise<VertexAIResponse> {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken || !accessToken.token) {
      throw new Error('Failed to get access token for Vertex AI');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI API error: ${response.status} - ${error}`);
    }

    return (await response.json()) as VertexAIResponse;
  }

  async streamContent(messages: VertexAIMessage[]): Promise<ReadableStream> {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken || !accessToken.token) {
      throw new Error('Failed to get access token for Vertex AI');
    }

    const response = await fetch(`${this.endpoint}:streamGenerateContent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI API error: ${response.status} - ${error}`);
    }

    return response.body!;
  }

  static getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: "Google's most capable model for a wide range of tasks",
        contextWindow: 32768,
        maxTokens: 2048,
        capabilities: ['text-generation', 'chat'],
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: 'Multimodal model that supports text and image inputs',
        contextWindow: 16384,
        maxTokens: 2048,
        capabilities: ['text-generation', 'chat', 'vision'],
      },
      {
        id: 'text-bison',
        name: 'PaLM 2 for Text',
        description: 'Optimized for text generation tasks',
        contextWindow: 8192,
        maxTokens: 1024,
        capabilities: ['text-generation'],
      },
      {
        id: 'code-bison',
        name: 'PaLM 2 for Code',
        description: 'Optimized for code generation and understanding',
        contextWindow: 6144,
        maxTokens: 1024,
        capabilities: ['code-generation', 'code-completion'],
      },
    ];
  }

  // Convert between Vertex AI format and standard format
  static convertToStandardMessage(vertexMessage: VertexAIMessage): {
    role: string;
    content: string;
  } {
    return {
      role: vertexMessage.role === 'model' ? 'assistant' : vertexMessage.role,
      content: vertexMessage.parts.map(part => part.text).join(''),
    };
  }

  static convertFromStandardMessage(standardMessage: {
    role: string;
    content: string;
  }): VertexAIMessage {
    return {
      role: standardMessage.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: standardMessage.content }],
    };
  }
}
