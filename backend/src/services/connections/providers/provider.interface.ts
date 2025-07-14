import { TestConnectionResponse, ModelInfo } from '../connection.types';

export type BaseConnectionConfig = {
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
};

export interface IProvider<TConfig extends BaseConnectionConfig> {
  testConnection(config: TConfig): Promise<TestConnectionResponse>;

  getAvailableModels(): ModelInfo[];

  getConnectionConfig(config: TConfig): any;
}
