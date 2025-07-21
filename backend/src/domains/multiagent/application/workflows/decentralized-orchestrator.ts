import { Observable, Subject, merge, timer } from 'rxjs';
import { filter, takeUntil, debounceTime } from 'rxjs/operators';
import { ConversationId, UserId, Agent, Message } from '../../core/types';
import { Effect, pure, flatMap, runEffect } from '../../core/effects';
import { EventStore } from '../../infrastructure/persistence/event.store';
import { 
  createConversationStream, 
  ConversationStreamHandles,
  StreamEvent 
} from '../../infrastructure/streaming/conversation.stream';
import {
  ConversationEvent,
  createConversationStartedEvent,
  createMessageGeneratedEvent,
  createConversationTerminatedEvent,
  createErrorOccurredEvent,
} from '../../domain/events';
import { 
  AutonomousAgent, 
  createAutonomousAgent, 
  createAgentLoop 
} from '../../domain/autonomous-agent';
import { ConversationMemory } from '../services/pattern-recognition.service';

export interface DecentralizedOrchestratorConfig {
  maxConversationDuration: number; // milliseconds
  maxMessages: number;
  loopDetectionThreshold: number; // number of similar messages
  staleConversationTimeout: number; // milliseconds
}

export interface OrchestratorDependencies {
  eventStore: EventStore;
  config: DecentralizedOrchestratorConfig;
}

interface ConversationContext {
  conversationId: ConversationId;
  userId: UserId;
  agents: Map<string, AutonomousAgent>;
  sharedMemory: ConversationMemory;
  messageQueue: Subject<Message>;
  stream: ConversationStreamHandles;
  startTime: number;
  messageCount: number;
  terminationSignal: Subject<void>;
}

export const createDecentralizedOrchestrator = (deps: OrchestratorDependencies) => {
  
  const detectConversationLoops = (messages: Message[]): boolean => {
    if (messages.length < deps.config.loopDetectionThreshold * 2) return false;
    
    const recentMessages = messages.slice(-deps.config.loopDetectionThreshold * 2);
    const messageContents = recentMessages.map(m => m.content.toLowerCase());
    
    // Check for repeating patterns
    const halfLength = messageContents.length / 2;
    const firstHalf = messageContents.slice(0, halfLength);
    const secondHalf = messageContents.slice(halfLength);
    
    // Calculate similarity
    let similarities = 0;
    for (let i = 0; i < firstHalf.length; i++) {
      const similarity = calculateSimilarity(firstHalf[i], secondHalf[i]);
      if (similarity > 0.8) similarities++;
    }
    
    return similarities >= deps.config.loopDetectionThreshold * 0.7;
  };
  
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    return union > 0 ? intersection / union : 0;
  };
  
  const shouldTerminateConversation = (context: ConversationContext): { terminate: boolean; reason: string } => {
    // Check max duration
    if (Date.now() - context.startTime > deps.config.maxConversationDuration) {
      return { terminate: true, reason: 'Maximum conversation duration reached' };
    }
    
    // Check max messages
    if (context.messageCount >= deps.config.maxMessages) {
      return { terminate: true, reason: 'Maximum message count reached' };
    }
    
    // Check for conversation loops
    if (detectConversationLoops(context.sharedMemory.recentMessages)) {
      return { terminate: true, reason: 'Conversation loop detected' };
    }
    
    // Check if conversation is stale
    const lastMessageTime = context.sharedMemory.recentMessages.slice(-1)[0]?.timestamp || context.startTime;
    if (Date.now() - lastMessageTime > deps.config.staleConversationTimeout) {
      return { terminate: true, reason: 'Conversation became stale' };
    }
    
    return { terminate: false, reason: '' };
  };
  
  const initializeAgents = (
    baseAgents: Agent[],
    messageQueue: Subject<Message>
  ): Map<string, AutonomousAgent> => {
    const agentMap = new Map<string, AutonomousAgent>();
    
    baseAgents.forEach(agent => {
      // Assign response thresholds based on agent characteristics
      const responseThreshold = calculateResponseThreshold(agent);
      const autonomousAgent = createAutonomousAgent(agent, responseThreshold);
      agentMap.set(agent.agentId, autonomousAgent);
    });
    
    return agentMap;
  };
  
  const calculateResponseThreshold = (agent: Agent): number => {
    // Analyze agent prompt/characteristics to determine eagerness
    const prompt = agent.prompt.toLowerCase();
    const characteristics = agent.characteristics.toLowerCase();
    
    // More talkative agents get higher thresholds
    if (prompt.includes('enthusiastic') || characteristics.includes('talkative')) {
      return 0.8;
    }
    if (prompt.includes('expert') || characteristics.includes('knowledgeable')) {
      return 0.6;
    }
    if (prompt.includes('quiet') || characteristics.includes('reserved')) {
      return 0.3;
    }
    
    return 0.5; // default
  };
  
  const runConversation = async (context: ConversationContext): Promise<void> => {
    const { agents, messageQueue, stream, terminationSignal } = context;
    
    console.log('[Orchestrator] Starting conversation with agents:', Array.from(agents.keys()));
    
    // Set up message broadcasting
    const broadcastMessage = (message: Message) => {
      console.log('[Orchestrator] Broadcasting message:', {
        speaker: message.speaker,
        content: message.content.substring(0, 100),
        agentId: message.agentId
      });
      // Update shared memory
      context.sharedMemory.recentMessages.push(message);
      context.sharedMemory.lastSpeakers = [
        ...context.sharedMemory.lastSpeakers.filter(id => id !== message.agentId),
        message.agentId!
      ].filter(Boolean).slice(-3);
      
      // Increment message count
      context.messageCount++;
      
      // Create and push event
      const event = createMessageGeneratedEvent(context.conversationId, message);
      console.log('[Orchestrator] Pushing event to stream:', event.type, event);
      stream.pushEvent(event);
      
      // Broadcast to all agents
      messageQueue.next(message);
      
      // Check termination conditions
      const { terminate, reason } = shouldTerminateConversation(context);
      if (terminate) {
        const terminationEvent = createConversationTerminatedEvent(
          context.conversationId,
          reason
        );
        stream.pushEvent(terminationEvent);
        terminationSignal.next();
      }
    };
    
    // Start all agent loops in parallel
    const agentLoops = Array.from(agents.values()).map(agent => {
      const loop = createAgentLoop(agent);
      return loop.runLoop(
        messageQueue.pipe(takeUntil(terminationSignal)),
        broadcastMessage
      );
    });
    
    // Monitor for stale conversations
    const staleMonitor = messageQueue.pipe(
      debounceTime(deps.config.staleConversationTimeout),
      takeUntil(terminationSignal)
    ).subscribe(() => {
      const terminationEvent = createConversationTerminatedEvent(
        context.conversationId,
        'Conversation became stale'
      );
      stream.pushEvent(terminationEvent);
      terminationSignal.next();
    });
    
    // Wait for all loops to complete
    try {
      await Promise.all(agentLoops);
    } catch (error) {
      console.error('Error in agent loops:', error);
      const errorEvent = createErrorOccurredEvent(
        context.conversationId,
        error instanceof Error ? error.message : String(error)
      );
      stream.pushEvent(errorEvent);
    } finally {
      staleMonitor.unsubscribe();
      stream.destroy();
    }
  };
  
  const startConversation = (
    conversationId: ConversationId,
    userId: UserId,
    agents: Agent[],
    initialMessage: string
  ): Effect<Observable<StreamEvent>> => {
    
    const startEvent = createConversationStartedEvent({
      conversationId,
      userId,
      agentIds: agents.map(a => a.agentId),
      agents,
      maxTurns: deps.config.maxMessages,
      initialMessage,
    });
    
    return flatMap(deps.eventStore.append(startEvent), () => {
      const stream = createConversationStream({
        initialState: { kind: 'Idle' },
        applyEvent: (state, _event) => state, // Simple state for streaming
      });
      
      const messageQueue = new Subject<Message>();
      const terminationSignal = new Subject<void>();
      
      const context: ConversationContext = {
        conversationId,
        userId,
        agents: initializeAgents(agents, messageQueue),
        sharedMemory: {
          recentMessages: [],
          conversationPhase: 'greeting',
          activeTopic: '',
          lastSpeakers: [],
          silenceDuration: 0,
          unansweredQuestions: [],
        },
        messageQueue,
        stream,
        startTime: Date.now(),
        messageCount: 0,
        terminationSignal,
      };
      
      // Start with user's initial message
      const userMessage: Message = {
        role: 'user',
        content: initialMessage,
        timestamp: Date.now(),
        speaker: 'User',
      };
      
      // Push initial event and message
      stream.pushEvent(createMessageGeneratedEvent(conversationId, userMessage));
      
      // Start the conversation immediately
      runConversation(context).then(() => {
        console.log('[Orchestrator] Conversation runner started');
      }).catch(error => {
        console.error('[Orchestrator] Error starting conversation:', error);
        const errorEvent = createErrorOccurredEvent(
          conversationId,
          error instanceof Error ? error.message : String(error)
        );
        stream.pushEvent(errorEvent);
      });
      
      // Broadcast initial message after agents are ready
      setTimeout(() => {
        console.log('[Orchestrator] Broadcasting initial user message:', userMessage.content);
        context.sharedMemory.recentMessages.push(userMessage);
        context.messageCount++;
        messageQueue.next(userMessage);
      }, 500);
      
      return pure(stream.transformToStreamEvents());
    });
  };
  
  const continueConversation = (
    conversationId: ConversationId,
    userId: UserId,
    newMessage: string
  ): Effect<Observable<StreamEvent>> => {
    return flatMap(deps.eventStore.getEvents(conversationId), events => {
      if (events.length === 0) {
        return pure(
          new Observable(subscriber => {
            subscriber.error(new Error(`Conversation ${conversationId} not found`));
          })
        );
      }
      
      // Find the start event to get agents
      const startEvent = events.find(e => e.type === 'ConversationStarted') as any;
      if (!startEvent) {
        return pure(
          new Observable(subscriber => {
            subscriber.error(new Error('Invalid conversation: no start event'));
          })
        );
      }
      
      // Check if conversation is already terminated
      const isTerminated = events.some(e => e.type === 'ConversationTerminated');
      if (isTerminated) {
        return pure(
          new Observable(subscriber => {
            subscriber.error(new Error('Conversation is already terminated'));
          })
        );
      }
      
      // Reconstruct message history
      const messages: Message[] = events
        .filter(e => e.type === 'MessageGenerated')
        .map((e: any) => e.message);
      
      const stream = createConversationStream({
        initialState: { kind: 'Idle' },
        applyEvent: (state, _event) => state,
      });
      
      const messageQueue = new Subject<Message>();
      const terminationSignal = new Subject<void>();
      
      const context: ConversationContext = {
        conversationId,
        userId,
        agents: initializeAgents(startEvent.agents || [], messageQueue),
        sharedMemory: {
          recentMessages: messages.slice(-20),
          conversationPhase: 'discussion',
          activeTopic: '',
          lastSpeakers: messages.slice(-3).map(m => m.agentId).filter(Boolean),
          silenceDuration: 0,
          unansweredQuestions: [],
        },
        messageQueue,
        stream,
        startTime: startEvent.timestamp,
        messageCount: messages.length,
        terminationSignal,
      };
      
      // Add new user message
      const userMessage: Message = {
        role: 'user',
        content: newMessage,
        timestamp: Date.now(),
        speaker: 'User',
      };
      
      const messageEvent = createMessageGeneratedEvent(conversationId, userMessage);
      
      return flatMap(deps.eventStore.append(messageEvent), () => {
        stream.pushEvent(messageEvent);
        
        // Start the conversation runner first
        runConversation(context).then(() => {
          console.log('[Orchestrator] Conversation runner started for continue');
        }).catch(error => {
          console.error('[Orchestrator] Error continuing conversation:', error);
          const errorEvent = createErrorOccurredEvent(
            conversationId,
            error instanceof Error ? error.message : String(error)
          );
          stream.pushEvent(errorEvent);
        });
        
        // Broadcast new message after agents are ready
        setTimeout(() => {
          console.log('[Orchestrator] Broadcasting new user message:', userMessage.content);
          context.sharedMemory.recentMessages.push(userMessage);
          context.messageCount++;
          messageQueue.next(userMessage);
        }, 500);
        
        return pure(stream.transformToStreamEvents());
      });
    });
  };
  
  return {
    startConversation,
    continueConversation,
  };
};