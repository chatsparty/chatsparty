import { Socket } from 'socket.io';
import { websocketService } from './websocket.service';
import { conversationService } from '../chat/conversation.service';
import { agentService } from '../agents/agent.service';
import { aiService } from '../ai/ai.service';
import { verifyToken } from '../../utils/auth';
import type { JwtPayload } from 'jsonwebtoken';

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

export function setupChatHandlers(socket: Socket): void {
  // Handle multi-agent conversation start
  socket.on('start_multi_agent_conversation', async (data: MultiAgentConversationData) => {
    console.log(`Received start_multi_agent_conversation from ${socket.id}`, data);
    
    try {
      const {
        conversation_id,
        agent_ids,
        initial_message,
        max_turns = 20,
        token,
        file_attachments,
        project_id
      } = data;

      // Validate authentication
      let userId: string | null = null;
      if (token) {
        try {
          const decoded = verifyToken(token) as JwtPayload;
          userId = decoded.userId;
        } catch (error) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'Authentication failed'
          });
          return;
        }
      }

      // Multi-agent conversations require authentication
      if (!userId) {
        socket.emit('conversation_error', {
          conversation_id,
          error: 'Authentication required for multi-agent conversations'
        });
        return;
      }

      // Validate agents exist
      const validAgents = await Promise.all(
        agent_ids.map(id => agentService.getAgent(id))
      );
      
      if (validAgents.some(agent => !agent)) {
        socket.emit('conversation_error', {
          conversation_id,
          error: 'One or more agents not found'
        });
        return;
      }

      // Store conversation data with client ID initially
      websocketService.getActiveConversations().set(conversation_id, {
        sid: socket.id,
        agentIds: agent_ids,
        userId,
        isActive: true,
        databaseId: null // Will be set after database creation
      });

      // Join conversation room
      socket.join(conversation_id);

      // Emit conversation started
      socket.emit('conversation_started', {
        conversation_id,
        agent_ids,
        status: 'started'
      });

      // Also emit to the room
      socket.to(conversation_id).emit('conversation_started', {
        conversation_id,
        agent_ids,
        status: 'started'
      });

      // Don't emit user's initial message as agent_message to avoid duplication
      // The frontend will add it when starting the conversation

      console.log(`Starting multi-agent conversation ${conversation_id} with agents ${agent_ids}`);

      // Start the multi-agent conversation stream
      try {
        let messageCount = 0;
        
        // Create or get conversation
        const conversationResult = await conversationService.createConversation(
          userId,
          initial_message.substring(0, 50) + '...',
          agent_ids,
          { projectId: project_id }
        );

        if (!conversationResult.success || !conversationResult.data) {
          throw new Error(conversationResult.error || 'Failed to create conversation');
        }

        const conversation = conversationResult.data;
        
        // Update the active conversation with database ID
        const activeConv = websocketService.getActiveConversations().get(conversation_id);
        if (activeConv) {
          activeConv.databaseId = conversation.id;
        }
        
        // Also store with database ID for easy lookup
        websocketService.getActiveConversations().set(conversation.id, {
          ...activeConv,
          databaseId: conversation.id
        });
        
        // Emit the database conversation ID to the client
        socket.emit('conversation_created', {
          client_conversation_id: conversation_id,
          database_conversation_id: conversation.id,
          title: conversation.title
        });

        // Save the initial user message
        await conversationService.addMessage(conversation.id, {
          role: 'user',
          content: initial_message,
          speaker: 'User',
          timestamp: Date.now()
        });

        // Stream the conversation
        const stream = aiService.streamMultiAgentConversation({
          conversationId: conversation.id,
          agentIds: agent_ids,
          initialMessage: initial_message,
          maxTurns: max_turns,
          userId,
          fileAttachments: file_attachments,
          projectId: project_id
        });

        for await (const event of stream) {
          messageCount++;
          
          // Check if conversation is still active
          if (!websocketService.isConversationActive(conversation_id)) {
            console.log(`Conversation ${conversation_id} is no longer active, stopping stream`);
            break;
          }

          // Handle different event types
          switch (event.type) {
            case 'thinking':
              await websocketService.emitTypingIndicator(
                conversation_id,
                event.agentId,
                event.agentName
              );
              break;

            case 'message':
              await websocketService.emitAgentMessage(
                conversation_id,
                event.agentId,
                event.agentName,
                event.content,
                event.timestamp || Date.now()
              );
              
              // Save message to database
              await conversationService.addMessage(conversation.id, {
                role: 'assistant',
                content: event.content || '',
                agentId: event.agentId,
                speaker: event.agentName,
                timestamp: event.timestamp || Date.now()
              });
              break;

            case 'error':
              await websocketService.emitError(conversation_id, event.message);
              break;

            case 'complete':
              await websocketService.emitConversationComplete(conversation_id);
              break;
          }
        }

        console.log(`Conversation ${conversation_id} completed with ${messageCount} messages`);

      } catch (error) {
        console.error(`Error in conversation ${conversation_id}:`, error);
        await websocketService.emitError(
          conversation_id,
          error instanceof Error ? error.message : 'An error occurred during the conversation'
        );
      }

    } catch (error) {
      console.error('Error starting multi-agent conversation:', error);
      socket.emit('conversation_error', {
        conversation_id: data.conversation_id,
        error: error instanceof Error ? error.message : 'Failed to start conversation'
      });
    }
  });

  // Handle sending a message in an existing conversation
  socket.on('send_message', async (data: SendMessageData) => {
    try {
      const { conversation_id, message, token } = data;

      // Validate authentication
      let userId: string | null = null;
      if (token) {
        try {
          const decoded = verifyToken(token) as JwtPayload;
          userId = decoded.userId;
        } catch (error) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'Authentication failed'
          });
          return;
        }
      }

      if (!userId) {
        socket.emit('conversation_error', {
          conversation_id,
          error: 'Authentication required'
        });
        return;
      }

      // First check if it's a database conversation ID
      let dbConversation = await conversationService.getConversation(userId, conversation_id);
      
      let conversationData: any;
      let databaseConversationId: string = conversation_id;
      
      if (dbConversation.success && dbConversation.data) {
        // This is a database conversation ID
        // Check if it's in active conversations or resume it
        conversationData = websocketService.getActiveConversations().get(conversation_id);
        
        if (!conversationData) {
          // Resume the conversation
          conversationData = {
            sid: socket.id,
            agentIds: dbConversation.data.agentIds,
            userId,
            isActive: true
          };
          websocketService.getActiveConversations().set(conversation_id, conversationData);
          socket.join(conversation_id);
          
          // Emit conversation resumed
          socket.emit('conversation_resumed', {
            conversation_id,
            status: 'resumed'
          });
        }
      } else {
        // Check if it's a client conversation ID in active conversations
        conversationData = websocketService.getActiveConversations().get(conversation_id);
        if (!conversationData) {
          socket.emit('conversation_error', {
            conversation_id,
            error: 'Conversation not found or inactive'
          });
          return;
        }
        
        // Mark conversation as active again for new messages
        conversationData.isActive = true;
        
        // Ensure socket is in the conversation room
        socket.join(conversation_id);
        
        // Get the database ID if available
        if (conversationData.databaseId) {
          databaseConversationId = conversationData.databaseId;
          // Try to get the database conversation
          const dbConv = await conversationService.getConversation(userId, conversationData.databaseId);
          if (dbConv.success && dbConv.data) {
            dbConversation = dbConv;
          }
        }
      }

      // Don't emit user message as agent_message to avoid duplication
      // The frontend will add it locally when sending

      // Save user message to database if we have a database ID
      if (dbConversation.success && dbConversation.data) {
        await conversationService.addMessage(databaseConversationId, {
          role: 'user',
          content: message,
          speaker: 'User',
          timestamp: Date.now()
        });
      }

      // Continue the conversation
      const stream = aiService.continueMultiAgentConversation({
        conversationId: databaseConversationId,
        message,
        agentIds: conversationData.agentIds,
        userId
      });

      for await (const event of stream) {
        if (!websocketService.isConversationActive(conversation_id)) {
          break;
        }

        switch (event.type) {
          case 'thinking':
            await websocketService.emitTypingIndicator(
              conversation_id,
              event.agentId,
              event.agentName
            );
            break;

          case 'message':
            await websocketService.emitAgentMessage(
              conversation_id,
              event.agentId,
              event.agentName,
              event.content,
              event.timestamp || Date.now()
            );
            
            // Save agent message to database
            if (dbConversation.success && dbConversation.data) {
              await conversationService.addMessage(databaseConversationId, {
                role: 'assistant',
                content: event.content || '',
                agentId: event.agentId,
                speaker: event.agentName,
                timestamp: event.timestamp || Date.now()
              });
            }
            break;

          case 'error':
            await websocketService.emitError(conversation_id, event.message);
            break;

          case 'complete':
            await websocketService.emitConversationComplete(conversation_id);
            break;
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('conversation_error', {
        conversation_id: data.conversation_id,
        error: error instanceof Error ? error.message : 'Failed to send message'
      });
    }
  });

  // Handle stop conversation
  socket.on('stop_conversation', async (data: { conversation_id: string }) => {
    try {
      await websocketService.stopConversation(data.conversation_id);
    } catch (error) {
      console.error('Error stopping conversation:', error);
    }
  });
}