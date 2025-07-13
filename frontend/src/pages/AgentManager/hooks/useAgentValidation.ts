import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelConnection } from '@/types/connection';

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
  connection_id: string;
}

export interface FormErrors {
  name?: string;
  characteristics?: string;
  connection_id?: string;
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
        
        
      case 'connection_id':
        // Make connection optional - backend will use default if not provided
        if (!value || value === '') {
          // Check if there's a default connection available
          const defaultConnection = connections.find(conn => conn.is_default || conn.id === 'chatsparty-default');
          if (!defaultConnection && connections.length > 0) {
            return t('errors.connection.noDefaultAvailable');
          }
          // If no value but default exists, it's valid
          return undefined;
        }
        // Don't validate connection if connections are still loading
        if (connections.length === 0) return undefined;
        const connection = connections.find(conn => conn.id === value);
        if (!connection) return t('errors.connection.notFound');
        if (!connection.is_active) return t('errors.connection.inactive');
        break;
    }
    return undefined;
  }, [t, connections]);

  const validateForm = useCallback((formData: FormData): boolean => {
    const newErrors: FormErrors = {};
    
    newErrors.name = validateField('name', formData.name);
    newErrors.characteristics = validateField('characteristics', formData.characteristics);
    newErrors.connection_id = validateField('connection_id', formData.connection_id);
    
    // Remove undefined entries from errors object
    const cleanedErrors: FormErrors = {};
    Object.keys(newErrors).forEach(key => {
      const error = newErrors[key as keyof FormErrors];
      if (error !== undefined && error !== null && error !== '') {
        cleanedErrors[key as keyof FormErrors] = error;
      }
    });
    
    setErrors(cleanedErrors);
    
    // Debug logging
    if (Object.keys(cleanedErrors).length > 0) {
      console.log('Validation errors:', cleanedErrors);
    }
    
    return Object.keys(cleanedErrors).length === 0;
  }, [validateField]);

  const validateFieldRealtime = useCallback((name: keyof FormData, value: any) => {
    const error = validateField(name, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
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