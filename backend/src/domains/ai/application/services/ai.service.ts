import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ConversationId, UserId, Agent } from '../../core/types';
import { runEffect } from '../../core/effects';
import { StreamEvent } from '../../infrastructure/streaming/conversation.stream';
import {
  createConversationWorkflow,
  WorkflowDependencies,
} from '../workflows/conversation.workflow';
import { InMemoryEventStore } from '../../infrastructure/persistence/event.store';
import {
  createProviderForAgent,
  createAgentSelector,
  createResponseGenerator,
  createTerminationChecker,
} from '../factories/workflow.factories';
import '../../infrastructure/providers/provider.config';

export interface AIServiceConfig {
  defaultMaxTurns: number;
  defaultTimeout: number;
  enableCaching: boolean;
}

const defaultConfig: AIServiceConfig = {
  defaultMaxTurns: 50,
  defaultTimeout: 30000,
  enableCaching: true,
};

const createWorkflowDependencies = (
  config: AIServiceConfig
): WorkflowDependencies => ({
  eventStore: new InMemoryEventStore(),
  agentSelector: createAgentSelector({ defaultTimeout: config.defaultTimeout }),
  responseGenerator: createResponseGenerator({
    defaultTimeout: config.defaultTimeout,
  }),
  terminationChecker: createTerminationChecker(),
  providerFactory: createProviderForAgent,
});

export const startConversation = (
  params: {
    conversationId: string;
    userId: string;
    agents: Agent[];
    initialMessage: string;
    maxTurns?: number;
  },
  config: AIServiceConfig = defaultConfig
): Observable<StreamEvent> => {
  const deps = createWorkflowDependencies(config);
  const workflow = createConversationWorkflow(deps);

  const effect = workflow.startConversation(
    params.conversationId as ConversationId,
    params.userId as UserId,
    params.agents,
    params.initialMessage,
    params.maxTurns ?? config.defaultMaxTurns
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
};

export const continueConversation = (
  params: {
    conversationId: string;
    userId: string;
    message: string;
    agents: Agent[];
  },
  config?: AIServiceConfig
): Observable<StreamEvent> => {
  return startConversation(
    {
      ...params,
      initialMessage: params.message,
    },
    config
  );
};

export interface AIService {
  startConversation: typeof startConversation;
  continueConversation: typeof continueConversation;
}

export const aiService: AIService = {
  startConversation: params => startConversation(params, defaultConfig),
  continueConversation: params => continueConversation(params, defaultConfig),
};
