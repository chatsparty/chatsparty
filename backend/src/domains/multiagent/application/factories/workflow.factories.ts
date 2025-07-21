import { createDecentralizedOrchestrator, DecentralizedOrchestratorConfig } from '../workflows/decentralized-orchestrator';
import { EventStore } from '../../infrastructure/persistence/event.store';

export interface WorkflowFactoryConfig {
  eventStore: EventStore;
  orchestratorConfig?: Partial<DecentralizedOrchestratorConfig>;
}

const defaultOrchestratorConfig: DecentralizedOrchestratorConfig = {
  maxConversationDuration: 30 * 60 * 1000, // 30 minutes
  maxMessages: 100,
  loopDetectionThreshold: 5,
  staleConversationTimeout: 60 * 1000, // 1 minute
};

export const createConversationWorkflow = (config: WorkflowFactoryConfig) => {
  const orchestratorConfig = {
    ...defaultOrchestratorConfig,
    ...config.orchestratorConfig,
  };

  return createDecentralizedOrchestrator({
    eventStore: config.eventStore,
    config: orchestratorConfig,
  });
};