import { Agent, Message } from '../types';

export function buildAgentSystemPrompt(agent: Agent): string {
  const styleInstructions: string[] = [];

  if (agent.chatStyle.friendliness === 'friendly') {
    styleInstructions.push(
      'Be warm, approachable, and friendly in your responses.'
    );
  } else if (agent.chatStyle.friendliness === 'formal') {
    styleInstructions.push('Maintain a professional and formal tone.');
  } else {
    styleInstructions.push(
      'Use a balanced, neither too casual nor too formal tone.'
    );
  }

  if (agent.chatStyle.responseLength === 'short') {
    styleInstructions.push(
      'Keep your responses brief and concise (1-2 sentences when possible).'
    );
  } else if (agent.chatStyle.responseLength === 'long') {
    styleInstructions.push(
      'Provide detailed, comprehensive responses with explanations.'
    );
  } else {
    styleInstructions.push(
      'Keep responses moderate in length - informative but not overly long.'
    );
  }

  if (agent.chatStyle.personality === 'enthusiastic') {
    styleInstructions.push('Show enthusiasm and energy in your responses.');
  } else if (agent.chatStyle.personality === 'reserved') {
    styleInstructions.push('Be thoughtful and measured in your responses.');
  } else {
    styleInstructions.push(
      'Maintain a balanced, engaging but not overwhelming personality.'
    );
  }

  if (agent.chatStyle.humor === 'witty') {
    styleInstructions.push('Feel free to include appropriate humor and wit.');
  } else if (agent.chatStyle.humor === 'light') {
    styleInstructions.push('Occasionally use light humor when appropriate.');
  } else {
    styleInstructions.push('Keep responses serious and focused.');
  }

  if (agent.chatStyle.expertiseLevel === 'beginner') {
    styleInstructions.push(
      'Explain concepts simply, as if speaking to a beginner.'
    );
  } else if (agent.chatStyle.expertiseLevel === 'intermediate') {
    styleInstructions.push(
      'Use moderate technical language appropriate for someone with some experience.'
    );
  } else {
    styleInstructions.push(
      'You can use technical language and assume advanced knowledge.'
    );
  }

  const styleText = styleInstructions.join(' ');

  return `You are ${agent.name}. 

Your role and characteristics: ${agent.characteristics}

Your specific instructions: ${agent.prompt}

Communication style: ${styleText}

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
}

function getLastSpeakers(messages: Message[]): string[] {
  const lastSpeakers: string[] = [];
  for (let i = messages.length - 1; i >= 0 && lastSpeakers.length < 3; i--) {
    const msg = messages[i];
    if (msg.speaker && !lastSpeakers.includes(msg.speaker)) {
      lastSpeakers.push(msg.speaker);
    }
  }
  return lastSpeakers;
}

export function buildSelectionPrompt(
  conversationContext: string,
  agentsInfo: Array<{ id: string; name: string; characteristics: string }>,
  allMessages: Message[]
): string {
  const agentsList = agentsInfo
    .map(agent => `- ${agent.id}: ${agent.name} - ${agent.characteristics}`)
    .join('\n');

  const lastSpeaker = allMessages[allMessages.length - 1]?.speaker || 'unknown';
  const lastSpeakers = getLastSpeakers(allMessages);

  const antiRepetitionNote =
    lastSpeakers.length > 0
      ? `\nIMPORTANT ANTI-REPETITION RULE: The following agents have spoken recently: ${lastSpeakers.join(
          ', '
        )}. You MUST select a DIFFERENT agent to ensure variety and natural conversation flow.`
      : '';

  return `
Available agents:
${agentsList}

Recent conversation:
${conversationContext}
`
    .replace('{{lastSpeaker}}', lastSpeaker)
    .replace('{{antiRepetitionNote}}', antiRepetitionNote)
    .replace('{{agentIdExample}}', agentsInfo[0]?.id || 'agent1');
}

export function buildTerminationPrompt(conversationContext: string): string {
  return `
Conversation context:
${conversationContext}
`;
}

export function getSupervisorSystemPrompt(
  type: 'selection' | 'termination'
): string {
  const selectionPrompt = `You are a conversation supervisor for a natural group chat. Your role is to decide who speaks next OR if the conversation should pause.

**CORE MISSION: Agents must assist the user with their tasks. They should not engage in off-topic conversations or talk amongst themselves unless explicitly asked to by the user.**

**CRITICAL RULES:**
- **Stay on topic:** Agents must stick to the user's request.
- **Wait for the user:** Agents must always wait for the user to reply before continuing. Do not generate back-to-back messages.
- **Address the user directly:** If the user mentions a specific agent by name, only that agent should respond.
- **No idle chatter:** Agents should not talk to each other unless the user instructs them to.

**DYNAMIC TURN MANAGEMENT:**
- You can now specify the number of turns an agent should take.
- If an agent needs to ask a series of questions or provide a detailed explanation, you can set \`turns\` to a higher number.
- If the conversation should pause and wait for the user, you can set \`turns\` to 0.
- Default is 1 turn.

IMPORTANT GROUP CHAT DYNAMICS:
- After a simple greeting (Hello, Hi, Hey), allow 1-2 agents to respond with a brief greeting.
- If the user doesn't provide a topic after the initial greetings, one of the agents should take the initiative to ask how they can help.
- Avoid long, formal introductions. Keep the greetings natural and brief.

Based on the conversation context and each agent's expertise, which agent should respond next?
Consider:
1. Which agent's expertise is most relevant to the current topic
2. Which agent hasn't spoken recently (for variety) - THIS IS CRITICAL
3. Which agent would provide the most valuable response
4. The selected agent should BUILD ON the current message, not repeat similar content`;

  const terminationPrompt = `You are a conversation supervisor analyzing whether a group chat should naturally pause.

CRITICAL RULES FOR GREETINGS:
- If user said "Hello/Hi/Hey" and 1-2 agents already responded with greetings, TERMINATE
- Simple greetings don't need everyone to respond - that's unnatural
- After brief greeting exchanges, conversations naturally pause until someone brings up a topic

Has this conversation reached a natural conclusion? Consider:
1. Have the main topics been thoroughly discussed?
2. Are agents starting to repeat themselves?
3. Has the user's question/request been adequately addressed?
4. Are there clear ending signals in the recent messages?`;

  return type === 'selection' ? selectionPrompt : terminationPrompt;
}
