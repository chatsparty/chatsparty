import { Agent, AgentId, Message } from '../core/types';
import { Effect, fromPromise, runEffect } from '../core/effects';
import {
  ConversationMemory,
  ResponseIntent,
  createPatternRecognizer,
} from '../application/services/pattern-recognition.service';
import { AIProvider } from '../infrastructure/providers/provider.interface';
import { createProviderForAgent } from '../application/services/provider.service';
import { Subject, Observable } from 'rxjs';

export interface AutonomousAgent extends Agent {
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

export const createAutonomousAgent = (baseAgent: Agent): AutonomousAgent => {
  return {
    ...baseAgent,
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

    memory.recentMessages = [...memory.recentMessages, message].slice(-20);

    if (message.agentId) {
      memory.lastSpeakers = [
        ...memory.lastSpeakers.filter(id => id !== message.agentId),
        message.agentId,
      ].slice(-3);
    }

    memory.silenceDuration = 0;

    if (message.content.includes('?')) {
      memory.unansweredQuestions.push({
        question: message.content,
        askedBy: message.speaker || message.agentId || 'Unknown',
        timestamp: message.timestamp,
      });
    }

    if (message.agentId === agent.agentId) {
      memory.myLastSpeakTime = message.timestamp;
      memory.unansweredQuestions = memory.unansweredQuestions.filter(
        q =>
          !message.content
            .toLowerCase()
            .includes(q.question.slice(0, 20).toLowerCase())
      );
    }
  };

  const makeDecision = async (provider: AIProvider): Promise<AgentDecision> => {
    const recognizer = createPatternRecognizer(provider);

    const patternResult = await runEffect(
      recognizer.recognizePattern(agent.personalMemory)
    );

    if (patternResult.kind === 'error') {
      console.error(
        `Pattern recognition failed for ${agent.name}:`,
        patternResult.error
      );

      return { agentId: agent.agentId, decision: 'skip' };
    }

    const pattern = patternResult.value;
    console.log(`[${agent.name}] Pattern recognized:`, pattern);

    const intentResult = await runEffect(
      recognizer.generateResponseIntent(
        {
          agentId: agent.agentId,
          agentName: agent.name,
          agentRole: agent.prompt,
          agentCharacteristics: agent.characteristics,
          chatStyle: JSON.stringify(agent.chatStyle),
        },
        pattern,
        agent.personalMemory
      )
    );

    if (intentResult.kind === 'error') {
      console.error(
        `Intent generation failed for ${agent.name}:`,
        intentResult.error
      );
      return { agentId: agent.agentId, decision: 'skip' };
    }

    const intent = intentResult.value;
    console.log(`[${agent.name}] Intent generated:`, intent);

    if (!intent.shouldSpeak || intent.priority === 'none') {
      return { agentId: agent.agentId, decision: 'skip', intent };
    }

    const baseWait = intent.suggestedDelay;
    const randomFactor = 0.8 + Math.random() * 0.4;
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
      provider.generateResponse(messages, systemPrompt)
    );

    if (result.kind === 'error') {
      throw result.error;
    }

    return result.value;
  };

  const checkRelevance = (decision: AgentDecision): boolean => {
    const memory = agent.personalMemory;
    const lastMessage = memory.recentMessages.slice(-1)[0];
    if (!lastMessage) return true;

    const timeSinceLastMessage = Date.now() - lastMessage.timestamp;

    if (timeSinceLastMessage > (decision.waitTime || 1000) + 10000) {
      return false;
    }

    const messagesAfterDecision = memory.recentMessages.filter(
      m => m.timestamp > lastMessage.timestamp && m.role === 'assistant'
    );
    if (messagesAfterDecision.length > 0) {
      return false;
    }

    return true;
  };

  const runLoop = async (
    messageStream: Observable<Message>,
    outputHandler: (message: Message) => void
  ): Promise<void> => {
    const provider = await initializeProvider();
    agent.provider = provider;

    messageStream.subscribe({
      next: async message => {
        console.log(`[${agent.name}] Received message:`, {
          speaker: message.speaker,
          content: message.content.substring(0, 50),
          agentId: message.agentId,
        });

        updateMemory(message);

        if (message.agentId === agent.agentId) {
          console.log(`[${agent.name}] Ignoring own message`);
          return;
        }

        const decision = await makeDecision(provider);
        console.log(`[${agent.name}] Decision:`, decision);

        if (decision.decision === 'speak' && decision.waitTime) {
          await new Promise(resolve => setTimeout(resolve, decision.waitTime));

          if (!checkRelevance(decision)) {
            console.log(
              `${agent.name} decided not to speak - no longer relevant`
            );
            return;
          }

          agent.isSpeaking = true;

          try {
            console.log(`[${agent.name}] Generating response...`);
            const response = await generateResponse(provider);
            console.log(
              `[${agent.name}] Response generated:`,
              response.substring(0, 100)
            );

            const agentMessage: Message = {
              role: 'assistant',
              content: response,
              timestamp: Date.now(),
              agentId: agent.agentId,
              speaker: agent.name,
            };

            updateMemory(agentMessage);

            console.log(`[${agent.name}] Sending message to output handler`);
            outputHandler(agentMessage);
          } catch (error) {
            console.error(`${agent.name} failed to generate response:`, error);
          } finally {
            agent.isSpeaking = false;
          }
        }
      },
      error: error => {
        console.error(`${agent.name} message stream error:`, error);
      },
      complete: () => {
        console.log(`${agent.name} conversation ended`);
        agent.isListening = false;
      },
    });

    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!agent.isListening) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
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
