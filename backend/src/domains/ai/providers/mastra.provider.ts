import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { AIProvider, Message } from '../types';
import { getModel } from '../../../config/mastra';

export class MastraProvider implements AIProvider {
  constructor(
    private provider: 'openai' | 'anthropic',
    private modelName: string
  ) {}

  async generateResponse(messages: Message[], maxTokens?: number): Promise<string> {
    const model = getModel(this.provider, this.modelName);
    
    const result = await generateText({
      model,
      messages: messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      maxTokens,
    });

    return result.text;
  }

  async generateStructuredResponse<T>(
    messages: Message[],
    schema: z.ZodSchema<T>,
    maxTokens?: number
  ): Promise<T> {
    const model = getModel(this.provider, this.modelName);
    
    const result = await generateObject({
      model,
      messages: messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      schema,
      maxTokens,
    });

    return result.object;
  }
}