import { describe, it, expect, vi } from 'vitest';
import { azureOpenAIProviderFactory } from '../azure-openai.provider';
import { runEffect } from '../../../core/effects';

describe('Azure OpenAI Provider', () => {
  it('should create azure openai provider with correct configuration', () => {
    const deploymentName = 'gpt-4';
    const config = {
      apiKey: 'test-api-key',
      resourceName: 'test-resource',
      apiVersion: '2024-10-01-preview',
    };

    const provider = azureOpenAIProviderFactory(deploymentName, config);

    expect(provider).toBeDefined();
    expect(provider.name).toBe('azure-openai');
    expect(provider.capabilities).toBeDefined();
    expect(provider.generateResponse).toBeDefined();
    expect(provider.generateStructuredResponse).toBeDefined();
  });

  it('should handle provider configuration with environment variables', () => {
    process.env.AZURE_API_KEY = 'env-api-key';
    process.env.AZURE_RESOURCE_NAME = 'env-resource';

    const provider = azureOpenAIProviderFactory('gpt-4', {});

    expect(provider).toBeDefined();
    expect(provider.name).toBe('azure-openai');
  });
});