import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ConversationId, UserId, Agent } from '../../core/types';
import { runEffect } from '../../core/effects';
import { StreamEvent } from '../../infrastructure/streaming/conversation.stream';
import {
  createConversationWorkflow,
  WorkflowFactoryConfig,
} from '../factories/workflow.factories';
import {
  EventStore,
  CachedEventStore,
} from '../../infrastructure/persistence/event.store';
import { createPrismaEventStore } from '../../infrastructure/persistence/prisma-event.store';
import { getPrismaClient } from '../../../../config/database';
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

const createWorkflowConfig = (): WorkflowFactoryConfig => {
  const config = getAIConfig();
  return {
    eventStore: getEventStore(),
    orchestratorConfig: {
      maxConversationDuration: 30 * 60 * 1000, // 30 minutes
      maxMessages: config.conversation.defaultMaxTurns || 100,
      loopDetectionThreshold: 5,
      staleConversationTimeout: 60 * 1000, // 1 minute
    },
  };
};

export const startConversation = (params: {
  conversationId: string;
  userId: string;
  agents: Agent[];
  initialMessage: string;
  maxTurns?: number;
}): Observable<StreamEvent> => {
  const workflowConfig = createWorkflowConfig();
  
  // Update the config with maxTurns if provided
  if (params.maxTurns && workflowConfig.orchestratorConfig) {
    workflowConfig.orchestratorConfig.maxMessages = params.maxTurns;
  }
  
  const workflow = createConversationWorkflow(workflowConfig);

  const effect = workflow.startConversation(
    params.conversationId as ConversationId,
    params.userId as UserId,
    params.agents,
    params.initialMessage
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
  const workflowConfig = createWorkflowConfig();
  const workflow = createConversationWorkflow(workflowConfig);

  const effect = workflow.continueConversation(
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