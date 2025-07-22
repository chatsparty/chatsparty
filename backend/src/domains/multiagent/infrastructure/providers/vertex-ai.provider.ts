import { createVertex } from '@ai-sdk/google-vertex';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { Message } from '../../core/types';
import {
  Effect,
  fromPromise,
  mapError,
  retry,
  timeout,
} from '../../core/effects';
import {
  AIProvider,
  ProviderConfig,
  GenerationOptions,
} from './provider.interface';
import { formatMessages, handleProviderError } from './base.provider';
import { PROVIDER_CAPABILITIES } from './capabilities';
import { DEFAULT_VERTEX_AI_SAFETY_SETTINGS } from '../../domain/constants';

const createVertexAIProvider = (
  modelName: string,
  config: ProviderConfig
): AIProvider => {
  const options: any = {
    location:
      process.env.VERTEX_AI_LOCATION ||
      process.env.GOOGLE_VERTEX_LOCATION ||
      'us-central1',
    project:
      config.baseUrl ||
      process.env.GOOGLE_VERTEX_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.DEFAULT_CONNECTION_PROJECT_ID,
  };

  if (config.baseUrl) {
    options.projectId = config.baseUrl;
  }

  if (config.apiKey) {
    try {
      const credentials = JSON.parse(config.apiKey);
      options.googleAuthOptions = { credentials };
    } catch {
      options.googleAuthOptions = { keyFilename: config.apiKey };
    }
  }

  const vertex = createVertex(options);
  const model = vertex(modelName);
  const capabilities = PROVIDER_CAPABILITIES.vertex_ai;
  const errorHandler = handleProviderError('vertex_ai');

  const generateResponse = (
    messages: Message[],
    systemPrompt: string,
    options?: GenerationOptions
  ): Effect<string> => {
    return mapError(
      retry(
        timeout(
          fromPromise(async () => {
            const formattedMessages = formatMessages(messages, systemPrompt);

            const response = await generateText({
              model,
              messages: formattedMessages,
              maxTokens: options?.maxTokens ?? capabilities.maxTokens,
              temperature: options?.temperature ?? 0.7,
              topP: options?.topP,
              stopSequences: options?.stopSequences,
              seed: options?.seed,
              experimental_providerMetadata: {
                google: {
                  safetySettings: [...DEFAULT_VERTEX_AI_SAFETY_SETTINGS],
                }
              }
            });

            if (!response.text) {
              // Fallback for safety filter blocks
              if (response.finishReason === 'stop' && response.text === '') {
                return "I apologize, but I'm unable to generate a response for this request. Please try rephrasing your message or asking something else.";
              }
              throw new Error('Empty response from Vertex AI');
            }

            return response.text;
          }),
          config.timeout ?? 30000
        ),
        config.retryAttempts ?? 3
      ),
      errorHandler
    );
  };

  const generateStructuredResponse = <T>(
    messages: Message[],
    systemPrompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerationOptions
  ): Effect<T> => {
    return mapError(
      retry(
        timeout(
          fromPromise(async () => {
            const formattedMessages = formatMessages(messages, systemPrompt);

            const response = await generateObject({
              model,
              messages: formattedMessages,
              schema,
              maxTokens: options?.maxTokens ?? capabilities.maxTokens,
              temperature: options?.temperature ?? 0.7,
              topP: options?.topP,
              seed: options?.seed,
              experimental_providerMetadata: {
                google: {
                  safetySettings: [...DEFAULT_VERTEX_AI_SAFETY_SETTINGS],
                }
              }
            });

            if (!response.object) {
              throw new Error('No object returned from Vertex AI');
            }

            return response.object as T;
          }),
          config.timeout ?? 30000
        ),
        config.retryAttempts ?? 3
      ),
      errorHandler
    );
  };

  return {
    name: 'vertex_ai',
    capabilities,
    generateResponse,
    generateStructuredResponse,
  };
};

export const vertexAIProviderFactory = createVertexAIProvider;
