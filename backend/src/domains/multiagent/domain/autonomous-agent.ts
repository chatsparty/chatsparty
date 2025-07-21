import { Agent, AgentId, Message } from '../core/types';
import { Effect, fromPromise, runEffect } from '../core/effects';
import { ConversationMemory, ResponseIntent, createPatternRecognizer } from '../application/services/pattern-recognition.service';
import { AIProvider } from '../infrastructure/providers/provider.interface';
import { createProviderForAgent } from '../application/services/provider.service';
import { Subject, Observable } from 'rxjs';

export interface AutonomousAgent extends Agent {
  responseThreshold: number; // 0.0 to 1.0 - how eager to speak
  personalMemory: ConversationMemory;
  isListening: boolean;
  isSpeaking: boolean;
  provider?: AIProvider;
  messageSubject: Subject<Message>;
}

export interface AgentDecision {
  agentId: AgentId;
  decision: 'speak' | 'wait' | 'skip';
  intent?: ResponseIntent;
  waitTime?: number;
  message?: string;
}

export const createAutonomousAgent = (
  baseAgent: Agent,
  responseThreshold: number = 0.5
): AutonomousAgent => {
  return {
    ...baseAgent,
    responseThreshold,
    personalMemory: {
      recentMessages: [],
      conversationPhase: 'greeting',
      activeTopic: '',
      lastSpeakers: [],
      silenceDuration: 0,
      unansweredQuestions: [],
    },
    isListening: true,
    isSpeaking: false,
    messageSubject: new Subject<Message>(),
  };
};

export const createAgentLoop = (agent: AutonomousAgent) => {
  
  const initializeProvider = async (): Promise<AIProvider> => {
    const result = await runEffect(createProviderForAgent(agent));
    if (result.kind === 'error') {
      throw result.error;
    }
    return result.value;
  };

  const updateMemory = (message: Message): void => {
    const memory = agent.personalMemory;
    
    // Add message to recent messages (keep last 20)
    memory.recentMessages = [...memory.recentMessages, message].slice(-20);
    
    // Update last speakers
    if (message.agentId) {
      memory.lastSpeakers = [
        ...memory.lastSpeakers.filter(id => id !== message.agentId),
        message.agentId
      ].slice(-3);
    }
    
    // Update silence duration
    memory.silenceDuration = 0;
    
    // Track unanswered questions
    if (message.content.includes('?')) {
      memory.unansweredQuestions.push({
        question: message.content,
        askedBy: message.speaker || message.agentId || 'Unknown',
        timestamp: message.timestamp,
      });
    }
    
    // Update last speak time if it was this agent
    if (message.agentId === agent.agentId) {
      memory.myLastSpeakTime = message.timestamp;
      // Clear questions this agent might have answered
      memory.unansweredQuestions = memory.unansweredQuestions.filter(
        q => !message.content.toLowerCase().includes(q.question.slice(0, 20).toLowerCase())
      );
    }
  };

  const makeDecision = async (provider: AIProvider): Promise<AgentDecision> => {
    const recognizer = createPatternRecognizer(provider);
    
    // First, recognize the current conversation pattern
    const patternResult = await runEffect(
      recognizer.recognizePattern(agent.personalMemory)
    );
    
    if (patternResult.kind === 'error') {
      console.error(`Pattern recognition failed for ${agent.name}:`, patternResult.error);
      
      // Fallback: Check for greeting pattern manually
      const lastMessage = agent.personalMemory.recentMessages.slice(-1)[0];
      if (lastMessage && lastMessage.content.toLowerCase().match(/hello|hi|hey|greetings/)) {
        console.log(`[${agent.name}] Fallback: Detected greeting, will respond`);
        return {
          agentId: agent.agentId,
          decision: 'speak',
          waitTime: 500 + Math.random() * 1000, // 500-1500ms delay
          intent: {
            shouldSpeak: true,
            priority: 'high',
            intent: 'answer_question',
            reasoning: 'Responding to greeting',
            suggestedDelay: 500
          }
        };
      }
      
      return { agentId: agent.agentId, decision: 'skip' };
    }
    
    const pattern = patternResult.value;
    console.log(`[${agent.name}] Pattern recognized:`, pattern);
    
    // Generate response intent based on pattern and agent context
    const intentResult = await runEffect(
      recognizer.generateResponseIntent(
        {
          agentId: agent.agentId,
          agentName: agent.name,
          agentRole: agent.prompt,
          responseThreshold: agent.responseThreshold,
        },
        pattern,
        agent.personalMemory
      )
    );
    
    if (intentResult.kind === 'error') {
      console.error(`Intent generation failed for ${agent.name}:`, intentResult.error);
      return { agentId: agent.agentId, decision: 'skip' };
    }
    
    const intent = intentResult.value;
    console.log(`[${agent.name}] Intent generated:`, intent);
    
    // Make decision based on intent
    if (!intent.shouldSpeak || intent.priority === 'none') {
      return { agentId: agent.agentId, decision: 'skip', intent };
    }
    
    // Calculate wait time with some randomness
    const baseWait = intent.suggestedDelay;
    const randomFactor = 0.8 + Math.random() * 0.4; // 80% to 120%
    const waitTime = Math.round(baseWait * randomFactor);
    
    return {
      agentId: agent.agentId,
      decision: 'speak',
      intent,
      waitTime,
    };
  };

  const generateResponse = async (provider: AIProvider): Promise<string> => {
    const systemPrompt = agent.prompt;
    const messages: Message[] = [
      { role: 'system', content: systemPrompt, timestamp: Date.now() },
      ...agent.personalMemory.recentMessages,
    ];
    
    const result = await runEffect(
      provider.generateResponse(messages, { maxTokens: 300 })
    );
    
    if (result.kind === 'error') {
      throw result.error;
    }
    
    return result.value;
  };

  const checkRelevance = (decision: AgentDecision): boolean => {
    // Check if the decision is still relevant after waiting
    const memory = agent.personalMemory;
    const timeSinceDecision = Date.now() - (memory.recentMessages.slice(-1)[0]?.timestamp || 0);
    
    // If too much time passed or many new messages, reconsider
    if (timeSinceDecision > 10000 || memory.silenceDuration > 5000) {
      return false;
    }
    
    // If someone else just answered the question we were going to answer
    if (decision.intent?.intent === 'answer_question') {
      const recentAnswers = memory.recentMessages.slice(-2);
      const questionAnswered = recentAnswers.some(m => 
        m.agentId !== agent.agentId && m.content.length > 50
      );
      if (questionAnswered) return false;
    }
    
    return true;
  };

  const runLoop = async (
    messageStream: Observable<Message>,
    outputHandler: (message: Message) => void
  ): Promise<void> => {
    const provider = await initializeProvider();
    agent.provider = provider;
    
    // Subscribe to incoming messages
    messageStream.subscribe({
      next: async (message) => {
        console.log(`[${agent.name}] Received message:`, {
          speaker: message.speaker,
          content: message.content.substring(0, 50),
          agentId: message.agentId
        });
        
        // Update memory with new message
        updateMemory(message);
        
        // Don't respond to own messages
        if (message.agentId === agent.agentId) {
          console.log(`[${agent.name}] Ignoring own message`);
          return;
        }
        
        // Make decision about speaking
        const decision = await makeDecision(provider);
        console.log(`[${agent.name}] Decision:`, decision);
        
        if (decision.decision === 'speak' && decision.waitTime) {
          // Wait before speaking
          await new Promise(resolve => setTimeout(resolve, decision.waitTime));
          
          // Check if still relevant
          if (!checkRelevance(decision)) {
            console.log(`${agent.name} decided not to speak - no longer relevant`);
            return;
          }
          
          // Set speaking flag
          agent.isSpeaking = true;
          
          try {
            // Generate and send response
            console.log(`[${agent.name}] Generating response...`);
            const response = await generateResponse(provider);
            console.log(`[${agent.name}] Response generated:`, response.substring(0, 100));
            
            const agentMessage: Message = {
              role: 'assistant',
              content: response,
              timestamp: Date.now(),
              agentId: agent.agentId,
              speaker: agent.name,
            };
            
            // Update own memory
            updateMemory(agentMessage);
            
            // Send message
            console.log(`[${agent.name}] Sending message to output handler`);
            outputHandler(agentMessage);
          } catch (error) {
            console.error(`${agent.name} failed to generate response:`, error);
          } finally {
            agent.isSpeaking = false;
          }
        }
      },
      error: (error) => {
        console.error(`${agent.name} message stream error:`, error);
      },
      complete: () => {
        console.log(`${agent.name} conversation ended`);
        agent.isListening = false;
      }
    });
    
    // Update silence duration periodically
    const silenceTimer = setInterval(() => {
      if (!agent.isSpeaking && agent.personalMemory.recentMessages.length > 0) {
        const lastMessage = agent.personalMemory.recentMessages.slice(-1)[0];
        agent.personalMemory.silenceDuration = Date.now() - lastMessage.timestamp;
        
        // Check if we should break silence
        if (agent.personalMemory.silenceDuration > 5000) {
          makeDecision(provider).then(decision => {
            if (decision.decision === 'speak') {
              agent.messageSubject.next({
                role: 'system',
                content: 'silence_check',
                timestamp: Date.now(),
              });
            }
          });
        }
      }
    }, 1000);
    
    // Cleanup on completion
    return new Promise((resolve) => {
      messageStream.subscribe().add(() => {
        clearInterval(silenceTimer);
        resolve();
      });
    });
  };

  return {
    updateMemory,
    makeDecision,
    generateResponse,
    checkRelevance,
    runLoop,
  };
};