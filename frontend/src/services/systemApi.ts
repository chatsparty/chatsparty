import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface SystemConfig {
  vm_workspace_enabled: boolean;
}

export const systemApi = {
  getConfig: async (): Promise<SystemConfig> => {
    const response = await axios.get(`${API_BASE_URL}/api/system/config`);
    return response.data;
  },
};