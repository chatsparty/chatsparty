export interface ChatStyle {
  friendliness: 'friendly' | 'neutral' | 'formal';
  response_length: 'short' | 'medium' | 'long';
  personality: 'enthusiastic' | 'balanced' | 'reserved';
  humor: 'none' | 'light' | 'witty';
  expertise_level: 'beginner' | 'intermediate' | 'expert';
}

export interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  chat_style?: ChatStyle;
}

export interface ConversationMessage {
  speaker: string;
  agent_id?: string;
  user_id?: string; // Added user_id
  message: string;
  timestamp: number;
  type?: 'message' | 'typing' | 'error' | 'info' | 'complete' | 'user_message'; // Added type, including user_message
}

export interface ActiveConversation {
  id: string;
  name: string;
  agents: string[];
  messages: ConversationMessage[];
  isActive: boolean;
  is_shared?: boolean;
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