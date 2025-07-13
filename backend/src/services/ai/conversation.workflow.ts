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

// Create the multi-agent conversation workflow
export function createMultiAgentWorkflow(conversationId: string, maxTurns: number = 10) {
  const workflow = createWorkflow({
    id: `multi-agent-conversation-${conversationId}`,
    inputSchema: z.object({
      initialMessage: z.string(),
      agents: z.array(AgentSchema),
      userId: z.string().optional(),
    }),
    outputSchema: z.object({
      finalState: ConversationStateSchema,
      events: z.array(z.custom<WorkflowEvent>()),
    }),
  });


  // Initial setup step
  const initializeStep = createStep({
    id: 'initialize',
    inputSchema: workflow.inputSchema,
    outputSchema: z.object({
      state: ConversationStateSchema,
    }),
    execute: async ({ inputData }) => {
      const { initialMessage, agents, userId } = inputData;
      
      // Register agents
      for (const agent of agents) {
        await agentManager.registerAgent(agent);
      }
      
      // Create initial state
      const initialState: ConversationState = {
        messages: [{
          role: 'user',
          content: initialMessage,
          speaker: 'user',
          timestamp: Date.now(),
        }],
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

  // Main conversation loop
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
          // Select speaker - using direct agent manager calls instead of step execution
          console.info(`Speaker selection - Turn ${state.turnCount}/${state.maxTurns}`);
          
          // Check if max turns reached
          if (state.turnCount >= state.maxTurns) {
            console.info('Max turns reached, ending conversation');
            state = { ...state, conversationComplete: true };
            break;
          }
          
          // Select next agent
          const selection = await agentManager.selectNextAgent(state, state.userId || undefined);
          
          if (!selection) {
            console.info('No agent selected, ending conversation');
            state = { ...state, conversationComplete: true };
            break;
          }
          
          console.info(`Selected agent: ${selection.agentId} - ${selection.reasoning}`);
          
          const agent = agentManager.getAgent(selection.agentId);
          if (!agent) {
            throw new Error(`Agent ${selection.agentId} not found`);
          }
          
          // Add progressive delay to avoid rate limiting (except for first response)
          if (state.turnCount > 0) {
            const baseDelay = 1000;
            const progressiveDelay = Math.min(state.turnCount * 200, 2000);
            const totalDelay = baseDelay + progressiveDelay;
            await new Promise(resolve => setTimeout(resolve, totalDelay));
          }
          
          // Generate response
          console.info(`Generating response from ${agent.name}`);
          const response = await agentManager.generateAgentResponse(
            selection.agentId,
            state.messages,
            state.userId || undefined
          );
          
          // Add response to state
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
          
          console.info(`Response generated: ${response.length} characters from ${agent.name}`);
          
          // Add event
          loopEvents.push({
            type: 'agent_response',
            agentId: selection.agentId,
            agentName: agent.name,
            message: response,
            timestamp: Date.now(),
          });
          
          // Check termination - skip for short conversations
          if (state.messages.length >= 3) {
            const termination = await agentManager.checkTermination(state, state.userId || undefined);
            
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
      
      // Add completion event
      if (state.conversationComplete) {
        loopEvents.push({
          type: 'conversation_complete',
          message: 'Conversation has reached a natural conclusion',
        });
      }
      
      return { state, events: loopEvents };
    },
  });

  // Cleanup step
  const cleanupStep = createStep({
    id: 'cleanup',
    inputSchema: z.object({
      state: ConversationStateSchema,
      events: z.array(z.custom<WorkflowEvent>()),
    }),
    outputSchema: workflow.outputSchema,
    execute: async ({ inputData }) => {
      const { state, events } = inputData;
      
      // Unregister agents
      for (const agent of state.agents) {
        await agentManager.unregisterAgent(agent.id);
      }
      
      return {
        finalState: state,
        events,
      };
    },
  });

  // Build the workflow
  workflow
    .then(initializeStep)
    .then(conversationLoopStep)
    .then(cleanupStep)
    .commit();

  return workflow;
}

// Helper to run a multi-agent conversation with real-time streaming
export async function runMultiAgentConversation(
  conversationId: string,
  initialMessage: string,
  agents: Agent[],
  userId?: string,
  maxTurns: number = 10
): Promise<AsyncGenerator<WorkflowEvent, void, unknown>> {
  // Create async generator for streaming events in real-time
  async function* eventGenerator(): AsyncGenerator<WorkflowEvent, void, unknown> {
    try {
      // Register agents first
      for (const agent of agents) {
        await agentManager.registerAgent(agent);
      }
      
      // Create initial state
      let state: ConversationState = {
        messages: [{
          role: 'user',
          content: initialMessage,
          speaker: 'user',
          timestamp: Date.now(),
        }],
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
      
      // Stream initialization event
      yield {
        type: 'status',
        message: 'Conversation initialized',
      } as WorkflowEvent;
      
      // Main conversation loop with real-time streaming
      while (!state.conversationComplete && state.turnCount < state.maxTurns) {
        try {
          console.info(`Speaker selection - Turn ${state.turnCount}/${state.maxTurns}`);
          
          // Check if max turns reached
          if (state.turnCount >= state.maxTurns) {
            console.info('Max turns reached, ending conversation');
            state = { ...state, conversationComplete: true };
            break;
          }
          
          // Select next agent
          const selection = await agentManager.selectNextAgent(state, userId);
          
          if (!selection) {
            console.info('No agent selected, ending conversation');
            state = { ...state, conversationComplete: true };
            break;
          }
          
          console.info(`Selected agent: ${selection.agentId} - ${selection.reasoning}`);
          
          const agent = agentManager.getAgent(selection.agentId);
          if (!agent) {
            throw new Error(`Agent ${selection.agentId} not found`);
          }
          
          // Stream speaker selection event
          yield {
            type: 'status',
            message: `${agent.name} is thinking...`,
          } as WorkflowEvent;
          
          // Add progressive delay to avoid rate limiting (except for first response)
          if (state.turnCount > 0) {
            const baseDelay = 1000;
            const progressiveDelay = Math.min(state.turnCount * 200, 2000);
            const totalDelay = baseDelay + progressiveDelay;
            await new Promise(resolve => setTimeout(resolve, totalDelay));
          }
          
          // Generate response
          console.info(`Generating response from ${agent.name}`);
          const response = await agentManager.generateAgentResponse(
            selection.agentId,
            state.messages,
            userId
          );
          
          // Add response to state
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
          
          console.info(`Response generated: ${response.length} characters from ${agent.name}`);
          
          // Stream the agent response immediately
          yield {
            type: 'agent_response',
            agentId: selection.agentId,
            agentName: agent.name,
            message: response,
            timestamp: Date.now(),
          } as WorkflowEvent;
          
          // Check termination - skip for short conversations
          if (state.messages.length >= 3) {
            const termination = await agentManager.checkTermination(state, userId);
            
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
      
      // Stream completion event
      yield {
        type: 'conversation_complete',
        message: 'Conversation has reached a natural conclusion',
      } as WorkflowEvent;
      
      // Cleanup: unregister agents
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