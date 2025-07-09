/**
 * Example usage of the Mastra multi-agent conversation system
 * This demonstrates how to create agents and run a conversation
 */

import { 
  Agent,
  runMultiAgentConversation,
  ChatStyle,
  WorkflowEvent
} from './index';

// Example function to create sample agents
export function createSampleAgents(): Agent[] {
  const defaultChatStyle: ChatStyle = {
    friendliness: 'friendly',
    responseLength: 'medium',
    personality: 'balanced',
    humor: 'light',
    expertiseLevel: 'expert',
  };

  const agents: Agent[] = [
    {
      agentId: 'tech-expert',
      name: 'Alex Tech',
      prompt: 'You are a technology expert who helps with software development, programming, and technical questions.',
      characteristics: 'Knowledgeable about modern web technologies, cloud computing, and software architecture',
      aiConfig: {
        provider: 'anthropic',
        modelName: 'claude-3-haiku-20240307',
      },
      chatStyle: {
        ...defaultChatStyle,
        expertiseLevel: 'expert',
        personality: 'enthusiastic',
      },
      connectionId: 'default',
      gender: 'neutral',
    },
    {
      agentId: 'creative-writer',
      name: 'Morgan Creative',
      prompt: 'You are a creative writer who helps with content creation, storytelling, and communication.',
      characteristics: 'Skilled in creative writing, content strategy, and effective communication',
      aiConfig: {
        provider: 'openai',
        modelName: 'gpt-4o-mini',
      },
      chatStyle: {
        ...defaultChatStyle,
        friendliness: 'friendly',
        humor: 'witty',
        responseLength: 'long',
      },
      connectionId: 'default',
      gender: 'neutral',
    },
    {
      agentId: 'business-analyst',
      name: 'Jordan Business',
      prompt: 'You are a business analyst who helps with strategy, market analysis, and business planning.',
      characteristics: 'Expert in business strategy, market trends, and data-driven decision making',
      aiConfig: {
        provider: 'anthropic',
        modelName: 'claude-3-haiku-20240307',
      },
      chatStyle: {
        ...defaultChatStyle,
        friendliness: 'formal',
        personality: 'reserved',
        humor: 'none',
      },
      connectionId: 'default',
      gender: 'neutral',
    },
  ];

  return agents;
}

// Example function to run a conversation
export async function runExampleConversation() {
  const agents = createSampleAgents();
  const conversationId = `conv-${Date.now()}`;
  const userId = 'example-user';
  
  console.info('Starting multi-agent conversation...');
  
  try {
    // Run the conversation
    const eventStream = await runMultiAgentConversation(
      conversationId,
      'Hello everyone! I need help building a new startup. Can you help me brainstorm ideas?',
      agents,
      userId,
      10 // max turns
    );
    
    // Process events
    for await (const event of eventStream) {
      switch (event.type) {
        case 'agent_response':
          console.info(`\n[${event.agentName}]: ${event.message}`);
          break;
          
        case 'conversation_complete':
          console.info(`\n[System]: ${event.message}`);
          break;
          
        case 'error':
          console.error(`\n[Error]: ${event.message}`);
          break;
          
        case 'status':
          console.info(`\n[Status]: ${event.message}`);
          break;
      }
    }
  } catch (error) {
    console.error('Error running conversation:', error);
  }
}

// Integration example for API endpoints
export async function handleChatRequest(
  message: string,
  agents: Agent[],
  conversationId: string,
  userId?: string
): Promise<AsyncGenerator<WorkflowEvent, void, unknown>> {
  // Validate agents
  if (!agents || agents.length === 0) {
    throw new Error('At least one agent is required for conversation');
  }
  
  // Run conversation
  return runMultiAgentConversation(
    conversationId,
    message,
    agents,
    userId,
    10 // configurable max turns
  );
}