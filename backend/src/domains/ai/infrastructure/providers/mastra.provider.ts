import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import { generateText, streamText } from 'ai';
import { Message, Result } from '../../core/types';
import { Effect, fromPromise, mapError } from '../../core/effects';
import { ProviderError } from '../../core/errors';
import {
  AIProvider,
  ProviderCapabilities,
  ProviderConfig,
  GenerationOptions,
} from './provider.interface';
import {
  formatMessages,
  handleProviderError,
  createStructuredResponseGenerator,
  withTimeout,
  createStreamTimeoutHandler,
} from './base.provider';
import { LanguageModel } from 'ai';

const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  openai: {
    streaming: true,
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 4096,
    contextWindow: 128000,
  },
  anthropic: {
    streaming: true,
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 4096,
    contextWindow: 200000,
  },
  groq: {
    streaming: true,
    functionCalling: false,
    structuredOutput: true,
    maxTokens: 4096,
    contextWindow: 32000,
  },
  google: {
    streaming: true,
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 8192,
    contextWindow: 1048576,
  },
  vertex_ai: {
    streaming: true,
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 8192,
    contextWindow: 1048576,
  },
};

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  streaming: false,
  functionCalling: false,
  structuredOutput: false,
  maxTokens: 2048,
  contextWindow: 8192,
};

const createProviderInstance = (name: string, config: ProviderConfig) => {
  switch (name) {
    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
    case 'groq':
      return createGroq({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
    case 'google':
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
    case 'vertex_ai':
      try {
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

        console.log(`[MastraProvider] Creating Vertex AI with options:`, {
          location: options.location,
          project: options.project,
          projectId: options.projectId,
          hasAuth: !!options.googleAuthOptions,
        });

        return createVertex(options);
      } catch (error) {
        console.error('Error creating Vertex AI provider:', error);
        throw new Error(
          `Failed to create Vertex AI provider: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    default:
      throw new Error(`Unsupported provider: ${name}`);
  }
};

const createResponseGenerator =
  (
    providerName: string,
    model: LanguageModel,
    capabilities: ProviderCapabilities
  ) =>
  (
    messages: Message[],
    systemPrompt: string,
    options?: GenerationOptions
  ): Effect<string> => {
    const errorHandler = handleProviderError(providerName);

    return mapError(
      fromPromise(async () => {
        const formattedMessages = formatMessages(messages, systemPrompt);
        const timeout = options?.timeout ?? 30000;

        console.log(
          `[MastraProvider] Generating response with ${providerName}`,
          {
            messagesCount: formattedMessages.length,
            timeout,
            maxTokens: options?.maxTokens ?? capabilities.maxTokens,
          }
        );

        try {
          console.log(`[MastraProvider] Calling generateText with:`, {
            modelId: model.modelId,
            messageCount: formattedMessages.length,
            systemMessage:
              formattedMessages[0]?.role === 'system'
                ? formattedMessages[0].content.substring(0, 100) + '...'
                : 'No system message',
          });

          const maxRetries = 3;
          let lastError: Error | null = null;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await withTimeout(
                generateText({
                  model,
                  messages: formattedMessages,
                  maxTokens: options?.maxTokens ?? capabilities.maxTokens,
                  temperature: options?.temperature ?? 0.7,
                  topP: options?.topP,
                  stopSequences: options?.stopSequences,
                  seed: options?.seed,
                }),
                timeout,
                `Response generation timeout: No response received within ${timeout}ms`
              );

              console.log(
                `[MastraProvider] Response received from ${providerName} (attempt ${attempt})`,
                {
                  hasText: !!response.text,
                  textLength: response.text?.length,
                  finishReason: response.finishReason,
                  usage: response.usage,
                }
              );

              if (response.text && response.text.trim().length > 0) {
                return response.text;
              }

              console.warn(
                `[MastraProvider] Empty response on attempt ${attempt}:`,
                {
                  responseText: response.text,
                  finishReason: response.finishReason,
                  usage: response.usage,
                  warnings: response.warnings,
                  model: model.modelId,
                  provider: providerName,
                  messageCount: formattedMessages.length,
                  lastMessage: formattedMessages[formattedMessages.length - 1],
                }
              );

              if (response.finishReason === 'stop' && response.text === '') {
                lastError = new Error(
                  `Model returned empty response (safety filter or content policy)`
                );
              } else if (response.finishReason === 'length') {
                lastError = new Error(`Response truncated due to length limit`);
              } else {
                lastError = new Error(`Empty response on attempt ${attempt}`);
              }

              if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`[MastraProvider] Retrying after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            } catch (error) {
              lastError =
                error instanceof Error ? error : new Error(String(error));
              console.error(
                `[MastraProvider] Error on attempt ${attempt}:`,
                error
              );

              if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(
                  `[MastraProvider] Retrying after ${delay}ms due to error...`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          if (
            providerName === 'vertex_ai' &&
            lastError?.message.includes('safety filter')
          ) {
            console.warn(
              '[MastraProvider] Falling back to generic response due to safety filters'
            );
            return "I apologize, but I'm unable to generate a response for this request. Please try rephrasing your message or asking something else.";
          }

          throw lastError || new Error('No response generated after retries');
        } catch (error) {
          console.error(`[MastraProvider] Error generating response:`, {
            error,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            provider: providerName,
            model: model.modelId,
          });
          throw errorHandler(error);
        }
      }),
      err => (err instanceof ProviderError ? err : errorHandler(err))
    );
  };

const createStreamResponseGenerator = (
  providerName: string,
  model: LanguageModel,
  capabilities: ProviderCapabilities
) =>
  async function* (
    messages: Message[],
    systemPrompt: string,
    options?: GenerationOptions
  ): AsyncIterable<Result<string>> {
    const formattedMessages = formatMessages(messages, systemPrompt);
    const timeout = options?.timeout ?? 30000;
    const errorHandler = handleProviderError(providerName);
    const timeoutHandler = createStreamTimeoutHandler(timeout);

    try {
      const result = streamText({
        model,
        messages: formattedMessages,
        maxTokens: options?.maxTokens ?? capabilities.maxTokens,
        temperature: options?.temperature,
        topP: options?.topP,
        stopSequences: options?.stopSequences,
        seed: options?.seed,
      });

      let hasReceivedChunks = false;
      timeoutHandler.start();

      try {
        for await (const chunk of result.textStream) {
          timeoutHandler.update();
          hasReceivedChunks = true;

          if (chunk) {
            yield { kind: 'ok', value: chunk };
          }
        }

        timeoutHandler.stop();

        if (!hasReceivedChunks) {
          throw new Error('Stream ended without generating any content');
        }
      } catch (streamError) {
        timeoutHandler.stop();
        throw streamError;
      }
    } catch (error) {
      yield { kind: 'error', error: errorHandler(error) };
    }
  };

export const createMastraProvider = (
  name: string,
  modelName: string,
  config: ProviderConfig
): AIProvider => {
  console.log(
    `[MastraProvider] Creating provider: ${name} with model: ${modelName}`
  );

  const capabilities = PROVIDER_CAPABILITIES[name] ?? DEFAULT_CAPABILITIES;
  const provider = createProviderInstance(name, config);

  let adjustedModelName = modelName;

  console.log(`[MastraProvider] Using model name: ${adjustedModelName}`);
  const model = provider(adjustedModelName);

  const generateResponse = createResponseGenerator(name, model, capabilities);
  const streamResponse = createStreamResponseGenerator(
    name,
    model,
    capabilities
  );
  const generateStructuredResponse = createStructuredResponseGenerator(
    name,
    config,
    generateResponse
  );

  return {
    name,
    capabilities,
    generateResponse,
    generateStructuredResponse,
    streamResponse,
  };
};

export const registerMastraProviders = (
  registry: Map<
    string,
    (modelName: string, config: ProviderConfig) => AIProvider
  >
) => {
  registry.set('openai', (modelName, config) =>
    createMastraProvider('openai', modelName, config)
  );
  registry.set('anthropic', (modelName, config) =>
    createMastraProvider('anthropic', modelName, config)
  );
  registry.set('groq', (modelName, config) =>
    createMastraProvider('groq', modelName, config)
  );
  registry.set('google', (modelName, config) =>
    createMastraProvider('google', modelName, config)
  );
  registry.set('vertex_ai', (modelName, config) =>
    createMastraProvider('vertex_ai', modelName, config)
  );
};
