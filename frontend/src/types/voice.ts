export interface VoiceConnection {
  id: string;
  name: string;
  description?: string;
  provider: string;
  provider_type: string;
  voice_id?: string;
  speed: number;
  pitch: number;
  stability: number;
  clarity: number;
  style: string;
  api_key?: string;
  base_url?: string;
  is_active: boolean;
  is_cloud_proxy: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVoiceConnectionRequest {
  name: string;
  description?: string;
  provider: string;
  provider_type: string;
  voice_id?: string;
  speed?: number;
  pitch?: number;
  stability?: number;
  clarity?: number;
  style?: string;
  api_key?: string;
  base_url?: string;
  is_cloud_proxy?: boolean;
}

export interface UpdateVoiceConnectionRequest
  extends Partial<CreateVoiceConnectionRequest> {
  is_active?: boolean;
}

export interface VoiceConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  latency_ms?: number;
  provider_info?: {
    provider?: string;
    supported_features?: {
      tts: boolean;
      stt: boolean;
    };
    subscription_tier?: string;
    character_count?: number;
    character_limit?: number;
    available_voices?: number;
    base_url?: string;
  };
}

export interface VoiceProvider {
  id: string;
  name: string;
  supported_types: string[];
  requires_api_key: boolean;
  default_base_url?: string;
  voices?: VoiceOption[];
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  category: string;
  gender?: string;
  age?: string;
  accent?: string;
  preview_url?: string;
  available_for_tiers?: string[];
}

export interface AgentVoiceConfig {
  voice_connection_id?: string;
  voice_enabled: boolean;
  podcast_settings?: {
    intro_enabled?: boolean;
    outro_enabled?: boolean;
    background_music?: boolean;
  };
}

export interface PodcastGenerationRequest {
  conversation_id: string;
  include_intro?: boolean;
  include_outro?: boolean;
  background_music?: boolean;
  export_format?: string;
}

export interface PodcastGenerationResponse {
  success: boolean;
  message: string;
  podcast_url?: string;
  duration_seconds?: number;
  file_size_mb?: number;
}
