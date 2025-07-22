import { createGoogleGenerativeAI } from '@ai-sdk/google';
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

const createGoogleProvider = (
  modelName: string,
  config: ProviderConfig
): AIProvider => {
  const google = createGoogleGenerativeAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });

  const adjustedModelName =
    modelName === 'gemini-2.0-flash' ? 'gemini-2.0-flash-exp' : modelName;

  const model = google(adjustedModelName);
  const capabilities = PROVIDER_CAPABILITIES.google;
  const errorHandler = handleProviderError('google');

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
              throw new Error('Empty response from Google');
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
              throw new Error('No object returned from Google');
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
    name: 'google',
    capabilities,
    generateResponse,
    generateStructuredResponse,
  };
};

export const googleProviderFactory = createGoogleProvider;
