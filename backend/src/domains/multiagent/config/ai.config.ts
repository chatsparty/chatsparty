export interface AIConfig {
  conversation: {
    defaultMaxTurns: number;
    defaultTimeout: number;
    recentMessagesForTermination: number;
    maxRetries: number;
    retryDelayBase: number;
    maxRetryDelay: number;
  };
  agentSelection: {
    timeout: number;
    maxTokens: number;
  };
  termination: {
    timeout: number;
    maxTokens: number;
  };
  providers: {
    enableCaching: boolean;
  };
}

export const defaultAIConfig: AIConfig = {
  conversation: {
    defaultMaxTurns: 50,
    defaultTimeout: 30000,
    recentMessagesForTermination: 5,
    maxRetries: 3,
    retryDelayBase: 1000,
    maxRetryDelay: 5000,
  },
  agentSelection: {
    timeout: 30000,
    maxTokens: 3000,
  },
  termination: {
    timeout: 30000,
    maxTokens: 3000,
  },
  providers: {
    enableCaching: true,
  },
};

export const getAIConfig = (): AIConfig => {
  return {
    ...defaultAIConfig,
    conversation: {
      ...defaultAIConfig.conversation,
      defaultMaxTurns: process.env.AI_DEFAULT_MAX_TURNS
        ? parseInt(process.env.AI_DEFAULT_MAX_TURNS, 10)
        : defaultAIConfig.conversation.defaultMaxTurns,
      defaultTimeout: process.env.AI_DEFAULT_TIMEOUT
        ? parseInt(process.env.AI_DEFAULT_TIMEOUT, 10)
        : defaultAIConfig.conversation.defaultTimeout,
    },
  };
};
