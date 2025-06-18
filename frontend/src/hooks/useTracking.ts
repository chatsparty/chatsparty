import { usePostHog } from 'posthog-js/react';

export interface TrackingEventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AgentCreatedProperties extends TrackingEventProperties {
  agent_name: string;
  agent_type: string;
  provider: string;
  model_name: string;
  chat_style_friendliness: string;
  chat_style_response_length: string;
  chat_style_personality: string;
  chat_style_humor: string;
  chat_style_expertise_level: string;
}

export interface MessageSentProperties extends TrackingEventProperties {
  message_length: number;
  conversation_type: 'single_agent' | 'multi_agent';
  agent_count?: number;
  conversation_id?: string;
}

export interface ConversationProperties extends TrackingEventProperties {
  conversation_id: string;
  agent_count: number;
  agent_names: string;
}

export interface ShareProperties extends TrackingEventProperties {
  conversation_id: string;
  action: 'share' | 'unshare' | 'copy_link';
  message_count: number;
}

export const useTracking = () => {
  const posthog = usePostHog();

  const trackEvent = (eventName: string, properties?: TrackingEventProperties) => {
    if (!posthog) return;
    
    try {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to track event:', eventName, error);
    }
  };

  // User Authentication Events
  const trackUserLogin = (method: 'google' | 'github') => {
    trackEvent('user_login', { login_method: method });
  };

  const trackUserLogout = () => {
    trackEvent('user_logout');
  };

  // Agent Management Events
  const trackAgentCreated = (properties: AgentCreatedProperties) => {
    trackEvent('agent_created', properties);
  };

  const trackAgentUpdated = (agentId: string, agentName: string) => {
    trackEvent('agent_updated', { 
      agent_id: agentId,
      agent_name: agentName 
    });
  };

  const trackAgentDeleted = (agentId: string, agentName: string) => {
    trackEvent('agent_deleted', { 
      agent_id: agentId,
      agent_name: agentName 
    });
  };

  // Chat Events
  const trackMessageSent = (properties: MessageSentProperties) => {
    trackEvent('message_sent', properties);
  };

  const trackMessageReceived = (responseTime: number, conversationType: 'single_agent' | 'multi_agent') => {
    trackEvent('message_received', { 
      response_time_ms: responseTime,
      conversation_type: conversationType 
    });
  };

  // Conversation Events
  const trackConversationStarted = (properties: ConversationProperties) => {
    trackEvent('conversation_started', properties);
  };

  const trackConversationShared = (properties: ShareProperties) => {
    trackEvent('conversation_shared', properties);
  };

  const trackConversationUnshared = (properties: ShareProperties) => {
    trackEvent('conversation_unshared', properties);
  };

  const trackShareLinkCopied = (properties: ShareProperties) => {
    trackEvent('share_link_copied', properties);
  };

  // Navigation Events
  const trackPageView = (pageName: string, additionalProperties?: TrackingEventProperties) => {
    trackEvent('page_view', { 
      page_name: pageName,
      ...additionalProperties 
    });
  };

  const trackNavigation = (from: string, to: string) => {
    trackEvent('navigation', { 
      from_page: from,
      to_page: to 
    });
  };

  // Connection Events
  const trackConnectionCreated = (provider: string, modelName: string) => {
    trackEvent('connection_created', { 
      provider,
      model_name: modelName 
    });
  };

  const trackConnectionUpdated = (connectionId: string, provider: string) => {
    trackEvent('connection_updated', { 
      connection_id: connectionId,
      provider 
    });
  };

  const trackConnectionDeleted = (connectionId: string, provider: string) => {
    trackEvent('connection_deleted', { 
      connection_id: connectionId,
      provider 
    });
  };

  // Error Events
  const trackError = (errorType: string, errorMessage: string, context?: string) => {
    trackEvent('error_occurred', { 
      error_type: errorType,
      error_message: errorMessage,
      context 
    });
  };

  // Feature Usage Events
  const trackFeatureUsed = (featureName: string, properties?: TrackingEventProperties) => {
    trackEvent('feature_used', { 
      feature_name: featureName,
      ...properties 
    });
  };

  return {
    trackEvent,
    trackUserLogin,
    trackUserLogout,
    trackAgentCreated,
    trackAgentUpdated,
    trackAgentDeleted,
    trackMessageSent,
    trackMessageReceived,
    trackConversationStarted,
    trackConversationShared,
    trackConversationUnshared,
    trackShareLinkCopied,
    trackPageView,
    trackNavigation,
    trackConnectionCreated,
    trackConnectionUpdated,
    trackConnectionDeleted,
    trackError,
    trackFeatureUsed,
  };
};