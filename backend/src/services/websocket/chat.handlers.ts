import { Socket } from 'socket.io';
import { websocketService } from './websocket.service';
import {
  createConversationService,
  addMessage,
  getConversation,
} from '../../domains/conversations/orchestration';
import * as agentManager from '../../domains/agents/orchestration/agent.manager';
import { aiService } from '../../domains/ai/application/services/ai.service';
import { verifyToken } from '../../utils/auth';
import type { JwtPayload } from 'jsonwebtoken';
import type { StreamEvent } from '../../domains/ai/infrastructure/streaming/conversation.stream';
import type { Agent } from '../../domains/ai/core/types';

interface MultiAgentConversationData {
  conversation_id: string;
  agent_ids: string[];
  initial_message: string;
  max_turns?: number;
  token?: string;
  file_attachments?: any;
  project_id?: string;
}

interface SendMessageData {
  conversation_id: string;
  message: string;
  token?: string;
}

async function* observableToAsyncIterable<T>(
  observable: any
): AsyncIterable<T> {
  const state = {
    values: [] as T[],
    error: null as any,
    done: false,
    resolve: null as (() => void) | null,
  };

  const subscription = observable.subscribe({
    next: (value: T) => {
      state.values.push(value);
      state.resolve?.();
    },
    error: (err: any) => {
      state.error = err;
      state.resolve?.();
    },
    complete: () => {
      state.done = true;
      state.resolve?.();
    },
  });

  try {
    while (!state.done) {
      if (state.values.length > 0) {
        yield state.values.shift()!;
      } else if (state.error) {
        throw state.error;
      } else {
        await new Promise<void>(resolve => {
          state.resolve = resolve;
        });
      }
    }
  } finally {
    subscription.unsubscribe();
  }
}

export function setupChatHandlers(socket: Socket): void {
  socket.on(
    'start_multi_agent_conversation',
    async (data: MultiAgentConversationData) => {
      try {
        const {
          conversation_id,
          agent_ids,
          initial_message,
          max_turns = 20,
          token,
          project_id,
        } = data;

        let userId: string | null = null;
        if (token) {
          try {
            const decoded = verifyToken(token) as JwtPayload;
            userId = decoded.userId;
          } catch (_error) {
            socket.emit('conversation_error', {
              conversation_id,
              error: 'Authentication failed',
            });
            return;
          }
        }

        if (!userId) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'Authentication required for multi-agent conversations',
          });
          return;
        }

        const agentPromises = agent_ids.map(id =>
          agentManager.getAgentWithFullConfig(userId!, id)
        );
        const agentResults = await Promise.all(agentPromises);

        if (agentResults.some(result => !result.success || !result.data)) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'One or more agents not found',
          });
          return;
        }

        websocketService.getActiveConversations().set(conversation_id, {
          sid: socket.id,
          agentIds: agent_ids,
          userId,
          isActive: true,
          databaseId: null,
        });

        socket.join(conversation_id);

        socket.emit('conversation_started', {
          conversation_id,
          agent_ids,
          status: 'started',
        });

        socket.to(conversation_id).emit('conversation_started', {
          conversation_id,
          agent_ids,
          status: 'started',
        });

        try {
          const conversationResult = await createConversationService(userId, {
            title: initial_message.substring(0, 50) + '...',
            agentIds: agent_ids,
            projectId: project_id,
            userId: userId,
          });

          if (!conversationResult.success || !conversationResult.data) {
            throw new Error(
              conversationResult.error || 'Failed to create conversation'
            );
          }

          const conversation = conversationResult.data;

          const activeConv = websocketService
            .getActiveConversations()
            .get(conversation_id);
          if (activeConv) {
            activeConv.databaseId = conversation.id;

            websocketService.getActiveConversations().set(conversation.id, {
              ...activeConv,
              databaseId: conversation.id,
            });
          }

          socket.emit('conversation_created', {
            client_conversation_id: conversation_id,
            database_conversation_id: conversation.id,
            title: conversation.title,
          });

          await addMessage(conversation.id, {
            role: 'user',
            content: initial_message,
            speaker: 'User',
            timestamp: Date.now(),
          });

          const agents: Agent[] = agentResults
            .filter(r => r.success && r.data)
            .map(r => r.data!);
          const observable = aiService.startConversation({
            conversationId: conversation.id,
            userId,
            agents,
            initialMessage: initial_message,
            maxTurns: max_turns,
          });

          for await (const event of observableToAsyncIterable<StreamEvent>(
            observable
          )) {
            if (!websocketService.isConversationActive(conversation_id)) {
              break;
            }

            // Only log errors and important events
            if (event.type === 'error' || process.env.DEBUG_SOCKET) {
              console.log(`[Socket Handler] Event received: ${event.type}`, {
                conversationId: conversation_id,
                event
              });
            }

            switch (event.type) {
              case 'thinking':
                console.log(`[Socket Handler] Emitting typing indicator for agent: ${event.agentName}`);
                await websocketService.emitTypingIndicator(
                  conversation_id,
                  event.agentId,
                  event.agentName
                );
                break;

              case 'message':
                console.log(`[Socket Handler] Emitting agent message from: ${event.agentName}`, {
                  content: event.content?.substring(0, 100),
                  contentLength: event.content?.length
                });
                await websocketService.emitAgentMessage(
                  conversation_id,
                  event.agentId,
                  event.agentName,
                  event.content || '',
                  event.timestamp || Date.now()
                );

                await addMessage(conversation.id, {
                  role: 'assistant',
                  content: event.content || '',
                  agentId: event.agentId,
                  speaker: event.agentName,
                  timestamp: event.timestamp || Date.now(),
                });
                break;

              case 'error':
                console.error(`Conversation error [${conversation_id}]:`, event.error);
                await websocketService.emitError(
                  conversation_id,
                  event.error?.message || 'An unknown error occurred'
                );
                break;

              case 'complete':
                console.log(`[Socket Handler] Conversation complete: ${conversation_id}`);
                await websocketService.emitConversationComplete(
                  conversation_id
                );
                break;
            }
          }
        } catch (error) {
          console.error(`Error in conversation ${conversation_id}:`, error);
          await websocketService.emitError(
            conversation_id,
            error instanceof Error
              ? error.message
              : 'An error occurred during the conversation'
          );
        }
      } catch (error) {
        console.error('Error starting multi-agent conversation:', error);
        socket.emit('conversation_error', {
          conversation_id: data.conversation_id,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to start conversation',
        });
      }
    }
  );

  socket.on('send_message', async (data: SendMessageData) => {
    try {
      const { conversation_id, message, token } = data;

      let userId: string | null = null;
      if (token) {
        try {
          const decoded = verifyToken(token) as JwtPayload;
          userId = decoded.userId;
        } catch (_error) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'Authentication failed',
          });
          return;
        }
      }

      if (!userId) {
        socket.emit('conversation_error', {
          conversation_id,
          error: 'Authentication required',
        });
        return;
      }

      let dbConversation = await getConversation(userId, conversation_id);

      let conversationData: any;
      let databaseConversationId: string = conversation_id;

      if (dbConversation.success && dbConversation.data) {
        conversationData = websocketService
          .getActiveConversations()
          .get(conversation_id);

        if (!conversationData) {
          conversationData = {
            sid: socket.id,
            agentIds: dbConversation.data.agentIds,
            userId,
            isActive: true,
          };
          websocketService
            .getActiveConversations()
            .set(conversation_id, conversationData);
          socket.join(conversation_id);

          socket.emit('conversation_resumed', {
            conversation_id,
            status: 'resumed',
          });
        }
      } else {
        conversationData = websocketService
          .getActiveConversations()
          .get(conversation_id);
        if (!conversationData) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'Conversation not found or inactive',
          });
          return;
        }

        conversationData.isActive = true;

        socket.join(conversation_id);

        if (conversationData.databaseId) {
          databaseConversationId = conversationData.databaseId;

          const dbConv = await getConversation(
            userId,
            conversationData.databaseId
          );
          if (dbConv.success && dbConv.data) {
            dbConversation = dbConv;
          }
        }
      }

      if (dbConversation.success && dbConversation.data) {
        await addMessage(databaseConversationId, {
          role: 'user',
          content: message,
          speaker: 'User',
          timestamp: Date.now(),
        });
      }

      const agentPromises = conversationData.agentIds.map((id: string) =>
        agentManager.getAgentWithFullConfig(userId!, id)
      );
      const agentResults = await Promise.all(agentPromises);
      const agents: Agent[] = agentResults
        .filter(r => r.success && r.data)
        .map(r => r.data!);

      const observable = aiService.continueConversation({
        conversationId: databaseConversationId,
        userId,
        message,
        agents,
      });

      for await (const event of observableToAsyncIterable<StreamEvent>(
        observable
      )) {
        if (!websocketService.isConversationActive(conversation_id)) {
          break;
        }

        console.log(`[Socket Handler - Send Message] Event received: ${event.type}`, {
          conversationId: conversation_id,
          event
        });

        switch (event.type) {
          case 'thinking':
            console.log(`[Socket Handler - Send Message] Emitting typing indicator for agent: ${event.agentName}`);
            await websocketService.emitTypingIndicator(
              conversation_id,
              event.agentId,
              event.agentName
            );
            break;

          case 'message':
            console.log(`[Socket Handler - Send Message] Emitting agent message from: ${event.agentName}`, {
              content: event.content?.substring(0, 100),
              contentLength: event.content?.length
            });
            await websocketService.emitAgentMessage(
              conversation_id,
              event.agentId,
              event.agentName,
              event.content || '',
              event.timestamp || Date.now()
            );

            if (dbConversation.success && dbConversation.data) {
              await addMessage(databaseConversationId, {
                role: 'assistant',
                content: event.content || '',
                agentId: event.agentId,
                speaker: event.agentName,
                timestamp: event.timestamp || Date.now(),
              });
            }
            break;

          case 'error':
            console.error(`Conversation error [${conversation_id}]:`, event.error);
            await websocketService.emitError(
              conversation_id,
              event.error?.message || 'An unknown error occurred'
            );
            break;

          case 'complete':
            console.log(`[Socket Handler - Send Message] Conversation complete: ${conversation_id}`);
            await websocketService.emitConversationComplete(conversation_id);
            break;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('conversation_error', {
        conversation_id: data.conversation_id,
        error:
          error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  });

  socket.on('stop_conversation', async (data: { conversation_id: string }) => {
    try {
      await websocketService.stopConversation(data.conversation_id);
    } catch (error) {
      console.error('Error stopping conversation:', error);
    }
  });
}
