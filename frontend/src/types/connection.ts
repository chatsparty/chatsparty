export interface ModelConnection {
  id: string;
  name: string;
  description?: string;
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateConnectionRequest {
  name: string;
  description?: string;
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
}

export interface UpdateConnectionRequest extends Partial<CreateConnectionRequest> {
  is_active?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
}