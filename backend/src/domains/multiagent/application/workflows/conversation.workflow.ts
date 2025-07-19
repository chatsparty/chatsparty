import { Observable } from 'rxjs';
import {
  ConversationId,
  UserId,
  Agent,
  Message,
  isNonEmpty,
} from '../../core/types';
import { Effect, pure, flatMap, runEffect } from '../../core/effects';
import {
  ConversationState,
  startConversation as createInitialConversationState,
  isSelectingAgent,
  isGeneratingResponse,
  isWaitingForTurn,
  isTerminated,
  applyEvent as applyEventToDomain,
} from '../../domain/conversation';
import {
  ConversationEvent,
  createConversationStartedEvent,
  createAgentSelectedEvent,
  createMessageGeneratedEvent,
  createConversationTerminatedEvent,
  createTurnCompletedEvent,
  createErrorOccurredEvent,
} from '../../domain/events';
import { selectControllerAgent } from '../../domain/agent';
import { EventStore } from '../../infrastructure/persistence/event.store';
import { AgentNotFoundError } from '../../core/errors';
import { InvalidStateTransitionError } from '../../core/domain-errors';
import {
  createConversationStream,
  ConversationStreamHandles,
  StreamEvent,
} from '../../infrastructure/streaming/conversation.stream';
import { AIProvider } from '../../infrastructure/providers/provider.interface';

export interface WorkflowDependencies {
  eventStore: EventStore;
  agentSelector: (agents: Agent[], messages: Message[]) => Effect<string>;
  responseGenerator: (
    agent: Agent,
    messages: Message[],
    provider: AIProvider
  ) => Effect<string>;
  terminationChecker: (
    messages: Message[],
    turnCount: number,
    maxTurns: number,
    agents?: Agent[]
  ) => Effect<boolean>;
  providerFactory: (agent: Agent) => Effect<AIProvider>;
}

export interface ConversationContext {
  conversationId: ConversationId;
  userId: UserId;
  agents: Agent[];
  controller: Agent;
  stream: ConversationStreamHandles;
  deps: WorkflowDependencies;
}

const selectAgent = async (
  state: ConversationState & { kind: 'SelectingAgent' },
  context: ConversationContext
): Promise<ConversationEvent> => {
  const effect = context.deps.agentSelector(
    context.agents,
    state.context.messages
  );
  const result = await runEffect(effect);

  if (result.kind === 'error') {
    throw result.error;
  }

  return createAgentSelectedEvent(
    state.context.conversationId,
    result.value as any
  );
};

const generateResponse = async (
  state: ConversationState & { kind: 'GeneratingResponse' },
  context: ConversationContext
): Promise<ConversationEvent> => {
  const agent = context.agents.find(a => a.agentId === state.selectedAgent);
  if (!agent) {
    throw new AgentNotFoundError(state.selectedAgent);
  }

  console.log(
    `[Workflow] Generating response for agent: ${agent.name} (${agent.agentId})`
  );

  const providerResult = await runEffect(context.deps.providerFactory(agent));
  if (providerResult.kind === 'error') {
    console.error(`[Workflow] Provider factory error:`, providerResult.error);
    throw providerResult.error;
  }

  try {
    console.log(
      `[Workflow] Calling response generator for agent: ${agent.name}`
    );
    const responseResult = await runEffect(
      context.deps.responseGenerator(
        agent,
        state.context.messages,
        providerResult.value
      )
    );

    if (responseResult.kind === 'error') {
      console.error(
        `[Workflow] Response generator error:`,
        responseResult.error
      );
      throw responseResult.error;
    }

    console.log(`[Workflow] Response generated successfully:`, {
      agentName: agent.name,
      contentLength: responseResult.value?.length,
      contentPreview: responseResult.value?.substring(0, 100),
    });

    const message: Message = {
      role: 'assistant',
      content: responseResult.value,
      timestamp: Date.now(),
      agentId: agent.agentId,
      speaker: agent.name,
    };

    return createMessageGeneratedEvent(state.context.conversationId, message);
  } catch (error) {
    console.error(
      `[Workflow] Response generation error for agent ${agent.name}:`,
      error
    );
    throw error;
  }
};

const checkTermination = async (
  state: ConversationState & { kind: 'WaitingForTurn' },
  context: ConversationContext
): Promise<ConversationEvent> => {
  const effect = context.deps.terminationChecker(
    state.context.messages,
    state.context.turnCount,
    state.context.maxTurns,
    context.agents
  );
  const result = await runEffect(effect);
  const shouldTerminate = result.kind === 'ok' ? result.value : false;

  if (shouldTerminate || state.context.turnCount >= state.context.maxTurns) {
    const reason = shouldTerminate
      ? 'Natural conversation end'
      : 'Maximum turns reached';
    return createConversationTerminatedEvent(
      state.context.conversationId,
      reason
    );
  }

  return createTurnCompletedEvent(
    state.context.conversationId,
    state.context.turnCount
  );
};

const processStateStep = async (
  state: ConversationState,
  context: ConversationContext
): Promise<ConversationEvent | null> => {
  if (isTerminated(state)) {
    return null;
  }

  if (isSelectingAgent(state)) {
    return selectAgent(state, context);
  }

  if (isGeneratingResponse(state)) {
    return generateResponse(state, context);
  }

  if (isWaitingForTurn(state)) {
    return checkTermination(state, context);
  }

  return null;
};

const runConversationLoop = async (
  initialState: ConversationState,
  context: ConversationContext
): Promise<void> => {
  let state = initialState;
  console.log(
    `[Workflow] Starting conversation loop for ${context.conversationId}`
  );

  while (!isTerminated(state)) {
    try {
      console.log(`[Workflow] Current state: ${state.kind}`);
      const event = await processStateStep(state, context);
      if (!event) {
        console.log(`[Workflow] No event generated, breaking loop`);
        break;
      }

      console.log(`[Workflow] Event generated: ${event.type}`, {
        conversationId: context.conversationId,
        eventType: event.type,
        event,
      });

      context.stream.pushEvent(event);
      state = applyEventToDomain(state, event);
    } catch (error) {
      console.error(`[Workflow] Error in conversation loop:`, error);
      const conversationId =
        state.kind !== 'Idle'
          ? state.context.conversationId
          : context.conversationId;

      const errorEvent = createErrorOccurredEvent(
        conversationId,
        error instanceof Error ? error.message : String(error)
      );
      context.stream.pushEvent(errorEvent);
      break;
    }
  }

  console.log(`[Workflow] Conversation loop ended, destroying stream`);
  context.stream.destroy();
};

export const createConversationWorkflow = (deps: WorkflowDependencies) => {
  const startConversation = (
    conversationId: ConversationId,
    userId: UserId,
    agents: Agent[],
    initialMessage: string,
    maxTurns: number = 10
  ): Effect<Observable<StreamEvent>> => {
    if (!isNonEmpty(agents)) {
      return pure(
        new Observable(subscriber => {
          subscriber.error(
            new InvalidStateTransitionError('Idle', 'startConversation')
          );
        })
      );
    }

    const initialState = createInitialConversationState(
      conversationId,
      userId,
      agents,
      maxTurns,
      initialMessage
    );

    const startEvent = createConversationStartedEvent({
      conversationId,
      userId,
      agentIds: agents.map(a => a.agentId),
      agents: agents as Agent[],
      maxTurns,
      initialMessage,
    });

    return flatMap(deps.eventStore.append(startEvent), () => {
      const stream = createConversationStream({
        initialState,
        applyEvent: applyEventToDomain,
      });

      const context: ConversationContext = {
        conversationId,
        userId,
        agents,
        controller: selectControllerAgent(agents),
        stream,
        deps,
      };

      runConversationLoop(initialState, context);

      return pure(stream.transformToStreamEvents());
    });
  };

  const loadAndContinueConversation = (
    conversationId: ConversationId,
    userId: UserId,
    newMessage: string
  ): Effect<Observable<StreamEvent>> => {
    return flatMap(deps.eventStore.getEvents(conversationId), events => {
      if (events.length === 0) {
        return pure(
          new Observable(subscriber => {
            subscriber.error(
              new Error(`Conversation ${conversationId} not found`)
            );
          })
        );
      }

      const startEvent = events.find(
        e => e.type === 'ConversationStarted'
      ) as any;

      if (!startEvent) {
        return pure(
          new Observable(subscriber => {
            subscriber.error(
              new Error(`Invalid conversation state: no start event found`)
            );
          })
        );
      }

      let state = createInitialConversationState(
        conversationId,
        startEvent.userId,
        startEvent.agents || [],
        startEvent.maxTurns,
        startEvent.initialMessage
      );

      for (const event of events) {
        state = applyEventToDomain(state, event);
      }

      if (isTerminated(state)) {
        return pure(
          new Observable(subscriber => {
            subscriber.error(
              new Error(`Conversation ${conversationId} is already terminated`)
            );
          })
        );
      }

      const userMessage: Message = {
        role: 'user',
        content: newMessage,
        timestamp: Date.now(),
        speaker: 'User',
      };

      const messageEvent = createMessageGeneratedEvent(
        conversationId,
        userMessage
      );

      return flatMap(deps.eventStore.append(messageEvent), () => {
        const newState = applyEventToDomain(state, messageEvent);

        const stream = createConversationStream({
          initialState: newState,
          applyEvent: applyEventToDomain,
        });

        const context: ConversationContext = {
          conversationId,
          userId,
          agents: startEvent.agents || [],
          controller: selectControllerAgent(startEvent.agents || []),
          stream,
          deps,
        };

        stream.pushEvent(messageEvent);

        runConversationLoop(newState, context);

        return pure(stream.transformToStreamEvents());
      });
    });
  };

  return {
    startConversation,
    loadAndContinueConversation,
  };
};
