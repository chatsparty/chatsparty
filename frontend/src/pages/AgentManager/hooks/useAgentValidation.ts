import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelConnection } from '@/types/connection';
import type { AgentVoiceConfig } from '@/types/voice';

const VALIDATION_RULES = {
  name: {
    min: 2,
    max: 50,
    pattern: /^[a-zA-Z0-9\s\-_]+$/
  },
  characteristics: {
    min: 10,
    max: 500
  }
} as const;

export interface FormData {
  name: string;
  characteristics: string;
  gender: string;
  connection_id: string;
  voice_config?: AgentVoiceConfig;
}

export interface FormErrors {
  name?: string;
  characteristics?: string;
  gender?: string;
  connection_id?: string;
  voice_config?: string;
}

export const useAgentValidation = (connections: ModelConnection[]) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((name: keyof FormData, value: any): string | undefined => {
    switch (name) {
      case 'name':
        const nameValue = typeof value === 'string' ? value.trim() : '';
        if (!nameValue) return t('errors.missingField');
        if (nameValue.length < VALIDATION_RULES.name.min) {
          return t('errors.name.tooShort', { min: VALIDATION_RULES.name.min });
        }
        if (nameValue.length > VALIDATION_RULES.name.max) {
          return t('errors.name.tooLong', { max: VALIDATION_RULES.name.max });
        }
        if (!VALIDATION_RULES.name.pattern.test(nameValue)) {
          return t('errors.name.invalidCharacters');
        }
        break;
        
      case 'characteristics':
        const charValue = typeof value === 'string' ? value.trim() : '';
        if (!charValue) return t('errors.missingField');
        if (charValue.length < VALIDATION_RULES.characteristics.min) {
          return t('errors.characteristics.tooShort', { min: VALIDATION_RULES.characteristics.min });
        }
        if (charValue.length > VALIDATION_RULES.characteristics.max) {
          return t('errors.characteristics.tooLong', { max: VALIDATION_RULES.characteristics.max });
        }
        break;
        
      case 'gender':
        if (!value) return t('errors.missingField');
        if (!['male', 'female', 'neutral'].includes(value)) {
          return t('errors.invalidInput');
        }
        break;
        
      case 'connection_id':
        if (!value) return t('errors.missingField');
        const connection = connections.find(conn => conn.id === value);
        if (!connection) return t('errors.connection.notFound');
        if (!connection.is_active) return t('errors.connection.inactive');
        break;
        
      case 'voice_config':
        if (value?.voice_enabled && !value?.voice_connection_id) {
          return t('errors.voice.connectionRequired');
        }
        break;
    }
    return undefined;
  }, [t, connections]);

  const validateForm = useCallback((formData: FormData): boolean => {
    const newErrors: FormErrors = {};
    
    newErrors.name = validateField('name', formData.name);
    newErrors.characteristics = validateField('characteristics', formData.characteristics);
    newErrors.gender = validateField('gender', formData.gender);
    newErrors.connection_id = validateField('connection_id', formData.connection_id);
    newErrors.voice_config = validateField('voice_config', formData.voice_config);
    
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key as keyof FormErrors] === undefined) {
        delete newErrors[key as keyof FormErrors];
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField]);

  const validateFieldRealtime = useCallback((name: keyof FormData, value: any) => {
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((name: keyof FormData) => {
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  return {
    errors,
    validateForm,
    validateFieldRealtime,
    clearErrors,
    clearFieldError,
    VALIDATION_RULES
  };
};