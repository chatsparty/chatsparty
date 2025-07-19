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
import { getAIConfig } from '../../config/ai.config';

const createWorkflowDependencies = (): WorkflowDependencies => {
  const config = getAIConfig();
  return {
    eventStore: new InMemoryEventStore(),
    agentSelector: createAgentSelector({ defaultTimeout: config.agentSelection.timeout }),
    responseGenerator: createResponseGenerator({
      defaultTimeout: config.conversation.defaultTimeout,
    }),
    terminationChecker: createTerminationChecker(),
    providerFactory: createProviderForAgent,
  };
};

export const startConversation = (
  params: {
    conversationId: string;
    userId: string;
    agents: Agent[];
    initialMessage: string;
    maxTurns?: number;
  }
): Observable<StreamEvent> => {
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

export const continueConversation = (
  params: {
    conversationId: string;
    userId: string;
    message: string;
    agents: Agent[];
  }
): Observable<StreamEvent> => {
  return startConversation({
    ...params,
    initialMessage: params.message,
  });
};

export interface AIService {
  startConversation: typeof startConversation;
  continueConversation: typeof continueConversation;
}

export const aiService: AIService = {
  startConversation,
  continueConversation,
};
