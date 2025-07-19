import { DomainError } from './errors';

export class ProviderCreationError extends DomainError {
  readonly _tag = 'ProviderCreationError';
  
  constructor(
    public readonly provider: string,
    public readonly reason: string
  ) {
    super(`Failed to create provider '${provider}': ${reason}`);
  }
}

export class ConversationTerminatedError extends DomainError {
  readonly _tag = 'ConversationTerminatedError';
  
  constructor(
    public readonly conversationId: string,
    public readonly reason: string
  ) {
    super(`Conversation '${conversationId}' terminated: ${reason}`);
  }
}

export class InvalidStateTransitionError extends DomainError {
  readonly _tag = 'InvalidStateTransitionError';
  
  constructor(
    public readonly currentState: string,
    public readonly attemptedTransition: string
  ) {
    super(`Invalid state transition from '${currentState}' via '${attemptedTransition}'`);
  }
}

export class MessageGenerationError extends DomainError {
  readonly _tag = 'MessageGenerationError';
  
  constructor(
    public readonly agentId: string,
    public readonly reason: string
  ) {
    super(`Failed to generate message for agent '${agentId}': ${reason}`);
  }
}

export class EventProcessingError extends DomainError {
  readonly _tag = 'EventProcessingError';
  
  constructor(
    public readonly eventType: string,
    public readonly reason: string
  ) {
    super(`Failed to process event '${eventType}': ${reason}`);
  }
}