import { createAzure } from '@ai-sdk/azure';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { Message } from '../../core/types';
import { Effect, fromPromise, mapError, retry, timeout } from '../../core/effects';
import {
  AIProvider,
  ProviderConfig,
  GenerationOptions,
} from './provider.interface';
import { formatMessages, handleProviderError } from './base.provider';
import { PROVIDER_CAPABILITIES } from './capabilities';

interface AzureOpenAIConfig extends ProviderConfig {
  resourceName?: string;
  apiVersion?: string;
}

const createAzureOpenAIProvider = (
  deploymentName: string,
  config: AzureOpenAIConfig
): AIProvider => {
  const azure = createAzure({
    resourceName: config.resourceName || process.env.AZURE_RESOURCE_NAME,
    apiKey: config.apiKey || process.env.AZURE_API_KEY,
    apiVersion: config.apiVersion || '2024-10-01-preview',
    baseURL: config.baseUrl,
  });
  
  const model = azure(deploymentName);
  const capabilities = PROVIDER_CAPABILITIES.openai; // Azure OpenAI has same capabilities as OpenAI
  const errorHandler = handleProviderError('azure-openai');

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
            });
            
            if (!response.text) {
              throw new Error('Empty response from Azure OpenAI');
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
            });
            
            if (!response.object) {
              throw new Error('No object returned from Azure OpenAI');
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
    name: 'azure-openai',
    capabilities,
    generateResponse,
    generateStructuredResponse,
  };
};

export const azureOpenAIProviderFactory = createAzureOpenAIProvider;