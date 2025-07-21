// Core types and utilities
export * from './core/types';
export * from './core/effects';
export * from './core/errors';

// Domain models
export * from './domain/conversation';
export * from './domain/agent';
export * from './domain/events';
export * from './domain/autonomous-agent';

// Infrastructure
export * from './infrastructure/providers/provider.interface';
export * from './infrastructure/persistence/event.store';
export * from './infrastructure/streaming/conversation.stream';

// Application services
export * from './application/services/ai.service';
export * from './application/services/pattern-recognition.service';
export * from './application/services/provider.service';

// Workflows
export * from './application/workflows/decentralized-orchestrator';

// Factories
export * from './application/factories/workflow.factories';

// Re-export main service for convenience
export { aiService } from './application/services/ai.service';