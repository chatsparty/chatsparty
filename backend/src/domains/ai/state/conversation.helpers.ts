import { generateText } from 'ai';
import { Message } from '../types';
import { getModel } from '../providers/ai.provider.factory';
import { SUPERVISOR_MODEL } from '../../../config/ai.config';

export async function getConversationContext(
  messages: Message[],
  maxMessages: number = 10,
  maxSummaryTokens: number = 1500
): Promise<string> {
  if (messages.length <= maxMessages) {
    return messages
      .map(msg => `${msg.speaker || 'User'}: ${msg.content}`)
      .join('\n');
  }

  const recentMessages = messages.slice(-maxMessages);
  const oldMessages = messages.slice(0, -maxMessages);

  const summaryPrompt = `Summarize the following conversation. Focus on key decisions, unresolved questions, and the overall trajectory of the discussion. Be concise, but do not lose critical information. The summary will be used to provide context to an AI agent that needs to decide what to do next.

CONVERSATION:
${oldMessages.map(msg => `${msg.speaker || 'User'}: ${msg.content}`).join('\n')}

SUMMARY:`;

  const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);
  const { text: summary } = await generateText({
    model,
    prompt: summaryPrompt,
    maxTokens: maxSummaryTokens,
  });

  return `Summary of earlier conversation:\n${summary}\n\nRecent messages:\n${recentMessages
    .map(msg => `${msg.speaker || 'User'}: ${msg.content}`)
    .join('\n')}`;
}

export function getLastSpeakers(messages: Message[]): string[] {
  const lastSpeakers: string[] = [];
  for (let i = messages.length - 1; i >= 0 && lastSpeakers.length < 3; i--) {
    const msg = messages[i];
    if (msg.speaker && !lastSpeakers.includes(msg.speaker)) {
      lastSpeakers.push(msg.speaker);
    }
  }
  return lastSpeakers;
}
