import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import type { VoiceOption } from '@/types/voice';

export const voiceApi = {
  async getAvailableVoices(connectionId: string): Promise<VoiceOption[]> {
    const response = await axios.get(`${API_BASE_URL}/voice-connections/${connectionId}/voices`);
    return response.data;
  },
};