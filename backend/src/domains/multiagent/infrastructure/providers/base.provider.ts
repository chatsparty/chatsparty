import { z } from 'zod';
import { Message } from '../../core/types';
import {
  Effect,
  fromPromise,
  retry,
  timeout,
  mapError,
} from '../../core/effects';
import { ProviderError } from '../../core/errors';
import {
  AIProvider,
  ProviderConfig,
  GenerationOptions,
} from './provider.interface';

export const formatMessages = (
  messages: Message[],
  systemPrompt: string
): any[] => {
  const formattedMessages: any[] = [];

  if (systemPrompt) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.forEach(msg => {
    formattedMessages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  return formattedMessages;
};

export const handleProviderError =
  (providerName: string) =>
  (error: unknown): ProviderError => {
    if (error instanceof Error) {
      return new ProviderError(providerName, error);
    }
    return new ProviderError(providerName, new Error(String(error)));
  };

const extractJSON = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Failed to parse structured response');
  }
};

export const createStructuredResponseGenerator =
  (
    providerName: string,
    config: ProviderConfig,
    generateResponse: AIProvider['generateResponse']
  ) =>
  <T>(
    messages: Message[],
    systemPrompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerationOptions
  ): Effect<T> => {
    const effect = generateResponse(messages, systemPrompt, options);

    return mapError(
      retry(
        timeout(
          fromPromise(async () => {
            const result = await effect();
            if (result.kind === 'error') {
              throw result.error;
            }

            const parsed = extractJSON(result.value);
            return schema.parse(parsed);
          }),
          config.timeout ?? 30000
        ),
        config.retryAttempts ?? 3
      ),
      err =>
        new ProviderError(
          providerName,
          err instanceof Error ? err : new Error(String(err))
        )
    );
  };

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

