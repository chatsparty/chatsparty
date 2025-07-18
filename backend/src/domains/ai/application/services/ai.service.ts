import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  ConversationId,
  UserId,
  Agent,
  Message,
} from '../../core/types';
import {
  Effect,
  runEffect,
  fromPromise,
} from '../../core/effects';
import { StreamEvent } from '../../infrastructure/streaming/conversation.stream';
import {
  ConversationWorkflow,
  WorkflowDependencies,
} from '../workflows/conversation.workflow';
import { InMemoryEventStore } from '../../infrastructure/persistence/event.store';
import { providerRegistry } from '../../infrastructure/providers/provider.interface';
import { createMastraProvider } from '../../infrastructure/providers/mastra.provider';
import {
  createPromptTemplate,
  interpolateTemplate,
  contextBasedStrategy,
} from '../../domain/agent';

export interface AIServiceConfig {
  defaultMaxTurns: number;
  defaultTimeout: number;
  enableCaching: boolean;
}

export class AIService {
  private workflow: ConversationWorkflow;

  constructor(
    private readonly config: AIServiceConfig = {
      defaultMaxTurns: 10,
      defaultTimeout: 30000,
      enableCaching: true,
    }
  ) {
    this.initializeProviders();

    const deps: WorkflowDependencies = {
      eventStore: new InMemoryEventStore(),
      agentSelector: this.createAgentSelector(),
      responseGenerator: this.createResponseGenerator(),
      terminationChecker: this.createTerminationChecker(),
      providerFactory: this.createProviderFactory(),
    };

    this.workflow = new ConversationWorkflow(deps);
  }

  startConversation(params: {
    conversationId: string;
    userId: string;
    agents: Agent[];
    initialMessage: string;
    maxTurns?: number;
  }): Observable<StreamEvent> {
    const effect = this.workflow.startConversation(
      params.conversationId as ConversationId,
      params.userId as UserId,
      params.agents,
      params.initialMessage,
      params.maxTurns ?? this.config.defaultMaxTurns
    );

    return from(runEffect(effect)).pipe(
      switchMap(result => {
        if (result.kind === 'ok') {
          return result.value;
        } else {
          throw result.error;
        }
      })
    );
  }

  continueConversation(params: {
    conversationId: string;
    userId: string;
    message: string;
    agents: Agent[];
  }): Observable<StreamEvent> {
    return this.startConversation({
      ...params,
      initialMessage: params.message,
    });
  }

  private initializeProviders(): void {
    providerRegistry.register(
      'openai',
      (model, config) => createMastraProvider('openai', model, config)
    );

    providerRegistry.register(
      'anthropic',
      (model, config) => createMastraProvider('anthropic', model, config)
    );

    providerRegistry.register(
      'groq',
      (model, config) => createMastraProvider('groq', model, config)
    );

    providerRegistry.register(
      'google',
      (model, config) => createMastraProvider('google', model, config)
    );

    providerRegistry.register(
      'vertex_ai',
      (model, config) => createMastraProvider('vertex_ai', model, config)
    );
  }

  private createAgentSelector() {
    return (
      agents: Agent[],
      messages: Message[]
    ): Effect<string> =>
      fromPromise(async () => {
        const agentId = contextBasedStrategy({
          conversationHistory: messages,
          availableAgents: agents,
          lastSpeaker: messages[messages.length - 1]?.agentId,
        });
        return agentId;
      });
  }

  private createResponseGenerator() {
    return (agent: Agent, messages: Message[], provider: any): Effect<string> =>
      fromPromise(async () => {
        const template = createPromptTemplate(
          agent.prompt,
          {
            name: agent.name,
            characteristics: agent.characteristics,
          },
          agent.chatStyle
        );

        const systemPrompt = interpolateTemplate(template);

        const effect = provider.generateResponse(messages, systemPrompt, {
          maxTokens: agent.maxTokens,
          timeout: this.config.defaultTimeout,
        });

        const result = await runEffect(effect);
        if (result.kind === 'error') {
          throw result.error;
        }

        return result.value as string;
      });
  }

  private createTerminationChecker() {
    return (
      messages: Message[],
      turnCount: number,
      maxTurns: number
    ): Effect<boolean> =>
      fromPromise(async () => {
        if (turnCount >= maxTurns) {
          return true;
        }

        const lastMessages = messages.slice(-3);
        const farewells = [
          'goodbye',
          'bye',
          'see you',
          'talk later',
          'thanks',
          'thank you',
        ];

        return lastMessages.some(msg =>
          farewells.some(farewell =>
            msg.content.toLowerCase().includes(farewell)
          )
        );
      });
  }

  private createProviderFactory() {
    return (agent: Agent): Effect<any> =>
      fromPromise(async () => {
        const factory = providerRegistry.get(agent.aiConfig.provider);
        if (!factory) {
          throw new Error(`Provider not found: ${agent.aiConfig.provider}`);
        }

        return factory(agent.aiConfig.modelName, {
          apiKey: agent.aiConfig.apiKey,
          baseUrl: agent.aiConfig.baseUrl,
        });
      });
  }
}

export const aiService = new AIService();
