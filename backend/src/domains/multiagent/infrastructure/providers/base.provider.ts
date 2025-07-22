import { Message } from '../../core/types';
import { ProviderError } from '../../core/errors';

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

