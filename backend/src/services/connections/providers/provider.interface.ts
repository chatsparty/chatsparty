import { TestConnectionResponse, ModelInfo } from '../connection.types';

export interface IProvider {
  testConnection(
    apiKey: string | null,
    baseUrl?: string | null,
    projectId?: string | null,
    location?: string | null
  ): Promise<TestConnectionResponse>;

  getAvailableModels(): ModelInfo[];

  getConnectionConfig(config: {
    apiKey: string | null;
    baseUrl: string | null;
    projectId: string | null;
    location: string | null;
    modelName: string;
  }): any;
}
