import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ConversationId, UserId, Agent } from '../../core/types';
import { runEffect } from '../../core/effects';
import { StreamEvent } from '../../infrastructure/streaming/conversation.stream';
import {
  createConversationWorkflow,
  WorkflowDependencies,
} from '../workflows/conversation.workflow';
import {
  EventStore,
  CachedEventStore,
} from '../../infrastructure/persistence/event.store';
import { createPrismaEventStore } from '../../infrastructure/persistence/prisma-event.store';
import { getPrismaClient } from '../../../../config/database';
import {
  createProviderForAgent,
  createAgentSelector,
  createResponseGenerator,
  createTerminationChecker,
} from '../factories/workflow.factories';
import { getAIConfig } from '../../config/ai.config';

let eventStore: EventStore | null = null;

const getEventStore = (): EventStore => {
  if (!eventStore) {
    const prisma = getPrismaClient();
    const baseStore = createPrismaEventStore(prisma);

    eventStore = new CachedEventStore(baseStore);
  }
  return eventStore;
};

const createWorkflowDependencies = (): WorkflowDependencies => {
  const config = getAIConfig();
  return {
    eventStore: getEventStore(),
    agentSelector: createAgentSelector({
      defaultTimeout: config.agentSelection.timeout,
      maxTokens: config.agentSelection.maxTokens,
    }),
    responseGenerator: createResponseGenerator({
      defaultTimeout: config.conversation.defaultTimeout,
    }),
    terminationChecker: createTerminationChecker(),
    providerFactory: createProviderForAgent,
  };
};

export const startConversation = (params: {
  conversationId: string;
  userId: string;
  agents: Agent[];
  initialMessage: string;
  maxTurns?: number;
}): Observable<StreamEvent> => {
  const config = getAIConfig();
  const deps = createWorkflowDependencies();
  const workflow = createConversationWorkflow(deps);

  const effect = workflow.startConversation(
    params.conversationId as ConversationId,
    params.userId as UserId,
    params.agents,
    params.initialMessage,
    params.maxTurns ?? config.conversation.defaultMaxTurns
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

export const continueConversation = (params: {
  conversationId: string;
  userId: string;
  message: string;
}): Observable<StreamEvent> => {
  const deps = createWorkflowDependencies();
  const workflow = createConversationWorkflow(deps);

  const effect = workflow.loadAndContinueConversation(
    params.conversationId as ConversationId,
    params.userId as UserId,
    params.message
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

export interface AIService {
  startConversation: typeof startConversation;
  continueConversation: typeof continueConversation;
}

export const aiService: AIService = {
  startConversation,
  continueConversation,
};
