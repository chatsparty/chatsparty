import { generateObject, generateText } from 'ai';
import {
  ConversationState,
  Message,
  TerminationDecision,
  TerminationDecisionSchema,
} from '../types';
import { SUPERVISOR_MODEL } from '../../../config/ai.config';
import { getSupervisorSystemPrompt } from '../generation/prompt.builder';
import { getModel } from '../providers/ai.provider.factory';
import { retryWithBackoff } from '../../../utils/retry';
import { buildTerminationPrompt } from '../generation/prompt.builder';

async function getConversationContext(
  messages: Message[],
  maxMessages: number = 5
): Promise<string> {
  const relevantMessages = messages.slice(-maxMessages);
  return relevantMessages
    .map(msg => `${msg.speaker || 'User'}: ${msg.content}`)
    .join('\n');
}

export async function checkTermination(
  state: ConversationState
): Promise<TerminationDecision> {
  try {
    const conversationContext = await getConversationContext(state.messages);
    const terminationPrompt = buildTerminationPrompt(conversationContext);
    const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);

    const result = await retryWithBackoff(
      () =>
        generateObject({
          model,
          schema: TerminationDecisionSchema,
          prompt: terminationPrompt,
          system: getSupervisorSystemPrompt('termination'),
          temperature: SUPERVISOR_MODEL.temperature,
          maxTokens: SUPERVISOR_MODEL.maxTokens,
        }),
      {
        retries: 3,
        initialDelay: 1000,
        onRetry: (error, attempt) => {
          console.error(
            `Error in termination check (attempt ${attempt}/3):`,
            error
          );
          if (error.name === 'NoObjectGeneratedError') {
            console.error('Model response:', error.response);
            console.error('Raw text:', error.text);
          }
        },
      }
    );

    const decision = result?.object || {
      shouldTerminate: false,
      reason: 'Parse error, continuing',
    };

    if (decision && !decision.reason) {
      decision.reason = 'Supervisor decision.';
    }

    return decision;
  } catch (error) {
    console.error('Error checking termination:', error);
    return {
      shouldTerminate: false,
      reason: 'Continuing due to parsing error',
    };
  }
}
