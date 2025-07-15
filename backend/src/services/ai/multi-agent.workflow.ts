import { createWorkflow, createStep } from '@mastra/core';
import { z } from 'zod';
import { agentManager } from './agent.manager';
import {
  Agent,
  AgentSchema,
  ConversationState,
  ConversationStateSchema,
  Message,
  WorkflowEvent,
} from './types';

export function createMultiAgentWorkflow(
  conversationId: string,
  maxTurns: number = 10
) {
  const workflow = createWorkflow({
    id: `multi-agent-conversation-${conversationId}`,
    inputSchema: z.object({
      initialMessage: z.string(),
      agents: z.array(AgentSchema),
      userId: z.string().optional(),
      existingMessages: z.array(z.custom<Message>()).optional(),
    }),
    outputSchema: z.object({
      finalState: ConversationStateSchema,
      events: z.array(z.custom<WorkflowEvent>()),
    }),
  });

  const initializeStep = createStep({
    id: 'initialize',
    inputSchema: workflow.inputSchema,
    outputSchema: z.object({
      state: ConversationStateSchema,
    }),
    execute: async ({ inputData }) => {
      const { initialMessage, agents, userId, existingMessages } = inputData;

      for (const agent of agents) {
        await agentManager.registerAgent(agent);
      }

      const initialState: ConversationState = {
        messages: existingMessages || [
          {
            role: 'user',
            content: initialMessage,
            speaker: 'user',
            timestamp: Date.now(),
          },
        ],
        agents: agents.map(a => ({
          id: a.agentId,
          name: a.name,
          characteristics: a.characteristics,
        })),
        currentSpeaker: null,
        turnCount: 0,
        maxTurns,
        conversationComplete: false,
        userId: userId || null,
        conversationId,
      };

      return { state: initialState };
    },
  });

  const conversationLoopStep = createStep({
    id: 'conversationLoop',
    inputSchema: z.object({
      state: ConversationStateSchema,
    }),
    outputSchema: z.object({
      state: ConversationStateSchema,
      events: z.array(z.custom<WorkflowEvent>()),
    }),
    execute: async ({ inputData }) => {
      let { state } = inputData;
      const loopEvents: WorkflowEvent[] = [];

      while (!state.conversationComplete && state.turnCount < state.maxTurns) {
        try {
          console.info(
            `Speaker selection - Turn ${state.turnCount}/${state.maxTurns}`
          );

          if (state.turnCount >= state.maxTurns) {
            console.info('Max turns reached, ending conversation');
            state = { ...state, conversationComplete: true };
            break;
          }

          const selection = await agentManager.selectNextAgent(
            state,
            state.userId || undefined
          );

          if (!selection || !selection.agentId) {
            console.info('No agent selected, pausing conversation');
            break;
          }

          const turns = selection.turns ?? 1;
          if (turns === 0) {
            console.info(
              'Supervisor requested a pause, waiting for user input.'
            );
            break;
          }

          console.info(
            `Selected agent: ${selection.agentId} for ${turns} turn(s) - ${selection.reasoning}`
          );

          for (let i = 0; i < turns; i++) {
            if (
              state.conversationComplete ||
              state.turnCount >= state.maxTurns
            ) {
              break;
            }

            const agent = agentManager.getAgent(selection.agentId);
            if (!agent) {
              throw new Error(`Agent ${selection.agentId} not found`);
            }

            if (state.turnCount > 0) {
              const baseDelay = 1000;
              const progressiveDelay = Math.min(state.turnCount * 200, 2000);
              const totalDelay = baseDelay + progressiveDelay;
              await new Promise(resolve => setTimeout(resolve, totalDelay));
            }

            console.info(
              `Generating response from ${agent.name} (Turn ${i + 1}/${turns})`
            );
            const response = await agentManager.generateAgentResponse(
              selection.agentId,
              state.messages,
              state.userId || undefined
            );

            const responseMessage: Message = {
              role: 'assistant',
              content: response,
              speaker: agent.name,
              agentId: agent.agentId,
              timestamp: Date.now(),
            };

            state = {
              ...state,
              messages: [...state.messages, responseMessage],
              turnCount: state.turnCount + 1,
              currentSpeaker: selection.agentId,
            };

            console.info(
              `Response generated: ${response.length} characters from ${agent.name}`
            );

            loopEvents.push({
              type: 'agent_response',
              agentId: selection.agentId,
              agentName: agent.name,
              message: response,
              timestamp: Date.now(),
            });
          }

          if (state.messages.length >= 3) {
            const termination = await agentManager.checkTermination(
              state,
              state.userId || undefined
            );

            if (termination.shouldTerminate) {
              console.info(`Termination decision: ${termination.reason}`);
              state = { ...state, conversationComplete: true };
              break;
            }
          }
        } catch (error) {
          console.error('Error in conversation loop:', error);
          loopEvents.push({
            type: 'error',
            message: `Conversation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          state = { ...state, conversationComplete: true };
          break;
        }
      }

      if (state.conversationComplete) {
        loopEvents.push({
          type: 'conversation_complete',
          message: 'Conversation has reached a natural conclusion',
        });
      }

      return { state, events: loopEvents };
    },
  });

  const cleanupStep = createStep({
    id: 'cleanup',
    inputSchema: z.object({
      state: ConversationStateSchema,
      events: z.array(z.custom<WorkflowEvent>()),
    }),
    outputSchema: workflow.outputSchema,
    execute: async ({ inputData }) => {
      const { state, events } = inputData;

      for (const agent of state.agents) {
        await agentManager.unregisterAgent(agent.id);
      }

      return {
        finalState: state,
        events,
      };
    },
  });

  workflow
    .then(initializeStep)
    .then(conversationLoopStep)
    .then(cleanupStep)
    .commit();

  return workflow;
}

export async function runMultiAgentConversation(
  conversationId: string,
  initialMessage: string,
  agents: Agent[],
  userId?: string,
  maxTurns: number = 10,
  existingMessages?: Message[]
): Promise<AsyncGenerator<WorkflowEvent, void, unknown>> {
  async function* eventGenerator(): AsyncGenerator<
    WorkflowEvent,
    void,
    unknown
  > {
    try {
      for (const agent of agents) {
        await agentManager.registerAgent(agent);
      }

      let state: ConversationState = {
        messages: existingMessages || [
          {
            role: 'user',
            content: initialMessage,
            speaker: 'user',
            timestamp: Date.now(),
          },
        ],
        agents: agents.map(a => ({
          id: a.agentId,
          name: a.name,
          characteristics: a.characteristics,
        })),
        currentSpeaker: null,
        turnCount: 0,
        maxTurns,
        conversationComplete: false,
        userId: userId || null,
        conversationId,
      };

      yield {
        type: 'status',
        message: 'Conversation initialized',
      } as WorkflowEvent;

      while (!state.conversationComplete && state.turnCount < state.maxTurns) {
        try {
          console.info(
            `Speaker selection - Turn ${state.turnCount}/${state.maxTurns}`
          );

          if (state.turnCount >= state.maxTurns) {
            console.info('Max turns reached, ending conversation');
            state = { ...state, conversationComplete: true };
            break;
          }

          const selection = await agentManager.selectNextAgent(state, userId);

          if (!selection || !selection.agentId) {
            console.info('No agent selected, pausing conversation');
            break;
          }

          const turns = selection.turns ?? 1;
          if (turns === 0) {
            console.info(
              'Supervisor requested a pause, waiting for user input.'
            );
            break;
          }

          console.info(
            `Selected agent: ${selection.agentId} for ${turns} turn(s) - ${selection.reasoning}`
          );

          for (let i = 0; i < turns; i++) {
            if (
              state.conversationComplete ||
              state.turnCount >= state.maxTurns
            ) {
              break;
            }

            const agent = agentManager.getAgent(selection.agentId);
            if (!agent) {
              throw new Error(`Agent ${selection.agentId} not found`);
            }

            yield {
              type: 'status',
              message: `${agent.name} is thinking...`,
            } as WorkflowEvent;

            if (state.turnCount > 0) {
              const baseDelay = 1000;
              const progressiveDelay = Math.min(state.turnCount * 200, 2000);
              const totalDelay = baseDelay + progressiveDelay;
              await new Promise(resolve => setTimeout(resolve, totalDelay));
            }

            console.info(
              `Generating response from ${agent.name} (Turn ${i + 1}/${turns})`
            );
            const response = await agentManager.generateAgentResponse(
              selection.agentId,
              state.messages,
              userId
            );

            const responseMessage: Message = {
              role: 'assistant',
              content: response,
              speaker: agent.name,
              agentId: agent.agentId,
              timestamp: Date.now(),
            };

            state = {
              ...state,
              messages: [...state.messages, responseMessage],
              turnCount: state.turnCount + 1,
              currentSpeaker: selection.agentId,
            };

            console.info(
              `Response generated: ${response.length} characters from ${agent.name}`
            );

            yield {
              type: 'agent_response',
              agentId: selection.agentId,
              agentName: agent.name,
              message: response,
              timestamp: Date.now(),
            } as WorkflowEvent;
          }

          if (state.messages.length >= 3) {
            const termination = await agentManager.checkTermination(
              state,
              userId
            );

            if (termination.shouldTerminate) {
              console.info(`Termination decision: ${termination.reason}`);
              state = { ...state, conversationComplete: true };
              break;
            }
          }
        } catch (error) {
          console.error('Error in conversation loop:', error);
          yield {
            type: 'error',
            message: `Conversation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          } as WorkflowEvent;
          state = { ...state, conversationComplete: true };
          break;
        }
      }

      yield {
        type: 'conversation_complete',
        message: 'Conversation has reached a natural conclusion',
      } as WorkflowEvent;

      for (const agent of state.agents) {
        await agentManager.unregisterAgent(agent.id);
      }
    } catch (error) {
      yield {
        type: 'error',
        message: `Error in conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      } as WorkflowEvent;
    }
  }

  return eventGenerator();
}
