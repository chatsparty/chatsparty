export interface ChatStyle {
  friendliness: 'friendly' | 'neutral' | 'formal';
  response_length: 'short' | 'medium' | 'long';
  personality: 'enthusiastic' | 'balanced' | 'reserved';
  humor: 'none' | 'light' | 'witty';
  expertise_level: 'beginner' | 'intermediate' | 'expert';
}

export interface Agent {
  id: string;
  name: string;
  prompt: string;
  characteristics: string;
  connectionId: string;
  aiConfig: any;
  chatStyle?: ChatStyle;
  voiceEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  speaker: string;
  agent_id?: string;
  message: string;
  timestamp: number;
}

export interface ActiveConversation {
  id: string;
  name: string;
  agents: string[];
  messages: ConversationMessage[];
  isActive: boolean;
  is_shared?: boolean;
  createdAt?: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  extractedContent?: string;
  isExtracting?: boolean;
}