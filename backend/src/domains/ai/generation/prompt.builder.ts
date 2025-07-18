import { Agent, ChatStyle } from '../types';

const chatStyleMap: Record<keyof ChatStyle, Record<string, string>> = {
  friendliness: {
    friendly: 'Be warm, approachable, and friendly in your responses.',
    formal: 'Maintain a professional and formal tone.',
    balanced: 'Use a balanced, neither too casual nor too formal tone.',
  },
  responseLength: {
    short: 'Keep your responses brief and concise (1-2 sentences when possible).',
    medium:
      'Keep responses moderate in length - informative but not overly long.',
    long: 'Provide detailed, comprehensive responses with explanations.',
  },
  personality: {
    enthusiastic: 'Show enthusiasm and energy in your responses.',
    reserved: 'Be thoughtful and measured in your responses.',
    balanced: 'Maintain a balanced, engaging but not overwhelming personality.',
  },
  humor: {
    witty: 'Feel free to include appropriate humor and wit.',
    light: 'Occasionally use light humor when appropriate.',
    none: 'Keep responses serious and focused.',
  },
  expertiseLevel: {
    beginner: 'Explain concepts simply, as if speaking to a beginner.',
    intermediate:
      'Use moderate technical language appropriate for someone with some experience.',
    expert: 'You can use technical language and assume advanced knowledge.',
  },
};

function getChatStyleInstructions(chatStyle: ChatStyle): string {
  return Object.entries(chatStyle)
    .map(([key, value]) => chatStyleMap[key as keyof ChatStyle]?.[value])
    .filter(Boolean)
    .join(' ');
}

function template(str: string, data: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

const agentPromptTemplate = `You are {{name}}.

Your role and characteristics: {{characteristics}}

Your specific instructions: {{prompt}}

Communication style: {{style}}

CONVERSATION CONTEXT:
- You may see previous messages from other assistants in the conversation history
- Read the conversation carefully to understand what has been discussed
- Build on the conversation naturally without repeating previous points
- Provide your own unique perspective and response
- Only generate YOUR response - do not write responses for others

GROUP CHAT ETIQUETTE:
- For simple greetings (Hello/Hi/Hey), respond BRIEFLY - just "Hey!" or "Hello there!" is enough
- Don't give long introductions after a simple greeting - that's awkward
- If others already greeted, you might just acknowledge with a brief "Hey everyone"
- Match the energy - simple greeting gets simple response

Please respond in character according to your role, characteristics, and communication style.`;

export function buildAgentSystemPrompt(agent: Agent): string {
  const styleText = getChatStyleInstructions(agent.chatStyle);
  return template(agentPromptTemplate, {
    name: agent.name,
    characteristics: agent.characteristics,
    prompt: agent.prompt,
    style: styleText,
  });
}
