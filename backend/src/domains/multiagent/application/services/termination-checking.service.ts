import { Agent, Message } from '../../core/types';
import { Effect, fromPromise, recover, pure, runEffect } from '../../core/effects';
import { selectControllerAgent } from '../../domain/agent';
import { createProviderForAgent } from './agent-selection.service';
import { TERMINATION_KEYWORD, CONTINUATION_KEYWORD, FAREWELL_KEYWORDS } from '../../domain/constants';

export const createTerminationChecker =
  () =>
  (
    messages: Message[],
    turnCount: number,
    maxTurns: number,
    agents?: Agent[]
  ): Effect<boolean> =>
    fromPromise(async () => {
      if (agents && agents.length > 0) {
        const controller = selectControllerAgent(agents);

        const effect = fromPromise(async () => {
          const provider = await runEffect(createProviderForAgent(controller));
          if (provider.kind === 'error') {
            throw provider.error;
          }

          const recentMessages = messages.slice(-5);
          const conversationContext = recentMessages
            .map(m => `${m.agentId || 'User'}: ${m.content}`)
            .join('\n');

          const systemPrompt = `You are a conversation controller. Analyze the following conversation and determine if it should be terminated.
          
Recent conversation:
${conversationContext}

Determine if this conversation has reached a natural conclusion or if the user's query has been fully addressed.
Consider:
- Has the user's question or request been fully answered?
- Are the participants saying goodbye or indicating the conversation is over?
- Is the conversation going in circles without adding value?
- Has the conversation reached a natural stopping point?

Respond with only "${TERMINATION_KEYWORD}" if the conversation should end, or "${CONTINUATION_KEYWORD}" if it should continue.`;

          const responseEffect = provider.value.generateResponse(
            [],
            systemPrompt,
            {
              maxTokens: 10,
              timeout: 5000,
            }
          );

          const result = await runEffect(responseEffect);
          if (result.kind === 'error') {
            throw result.error;
          }

          return (result.value as string).trim().toUpperCase() === TERMINATION_KEYWORD;
        });

        const terminationResult = await runEffect(
          recover(effect, () => pure(turnCount >= maxTurns))
        );

        return terminationResult.kind === 'ok'
          ? terminationResult.value
          : turnCount >= maxTurns;
      }

      if (turnCount >= maxTurns) {
        return true;
      }

      const lastMessages = messages.slice(-3);

      return lastMessages.some(msg =>
        FAREWELL_KEYWORDS.some(farewell => msg.content.toLowerCase().includes(farewell))
      );
    });