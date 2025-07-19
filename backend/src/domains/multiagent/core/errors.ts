import { z } from 'zod';

export abstract class DomainError extends Error {
  abstract readonly _tag: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AgentNotFoundError extends DomainError {
  readonly _tag = 'AgentNotFoundError';

  constructor(public readonly agentId: string) {
    super(`Agent not found: ${agentId}`);
  }
}

export class ConversationNotFoundError extends DomainError {
  readonly _tag = 'ConversationNotFoundError';

  constructor(public readonly conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
  }
}

export class ProviderError extends DomainError {
  readonly _tag = 'ProviderError';

  constructor(
    public readonly provider: string,
    public readonly originalError: Error
  ) {
    super(`Provider error (${provider}): ${originalError.message}`);
  }
}

export class ValidationError extends DomainError {
  readonly _tag = 'ValidationError';

  constructor(public readonly errors: z.ZodError) {
    super(`Validation failed: ${errors.message}`);
  }
}

export class MaxTurnsExceededError extends DomainError {
  readonly _tag = 'MaxTurnsExceededError';

  constructor(public readonly maxTurns: number) {
    super(`Maximum turns exceeded: ${maxTurns}`);
  }
}

export class TimeoutError extends DomainError {
  readonly _tag = 'TimeoutError';

  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
  }
}

export type ErrorMatcher<E extends DomainError, R> = {
  [K in E['_tag']]: (error: Extract<E, { _tag: K }>) => R;
};

export const matchError = <E extends DomainError, R>(
  error: E,
  matchers: ErrorMatcher<E, R>
): R => {
  const matcher = matchers[error._tag as E['_tag']];
  if (!matcher) {
    throw new Error(`No matcher for error tag: ${error._tag}`);
  }
  return matcher(error as any);
};

export const isAgentNotFoundError = (e: unknown): e is AgentNotFoundError =>
  e instanceof AgentNotFoundError;

export const isProviderError = (e: unknown): e is ProviderError =>
  e instanceof ProviderError;

export const isValidationError = (e: unknown): e is ValidationError =>
  e instanceof ValidationError;

export const isMaxTurnsExceededError = (
  e: unknown
): e is MaxTurnsExceededError => e instanceof MaxTurnsExceededError;

export const isTimeoutError = (e: unknown): e is TimeoutError =>
  e instanceof TimeoutError;
