export const createConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'provider'],
    properties: {
      name: { type: 'string' },
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'vertex_ai'],
      },
      config: { type: 'object' },
      isDefault: { type: 'boolean' },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        provider: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const listConnectionsSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      provider: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              provider: { type: 'string' },
              isDefault: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export const getConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        provider: { type: 'string' },
        availableModels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export const updateConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      modelName: { type: 'string' },
      apiKey: { type: 'string' },
      baseUrl: { type: 'string' },
      isActive: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        provider: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

export const deleteConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    204: {
      type: 'null',
    },
  },
};

export const testConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'google', 'groq', 'ollama', 'vertex_ai'],
      },
      apiKey: { type: 'string' },
      baseUrl: { type: 'string' },
      modelName: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        availableModels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
        error: { type: 'string' },
      },
    },
  },
};

export const setDefaultConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['connectionId'],
    properties: {
      connectionId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        provider: { type: 'string' },
        isDefault: { type: 'boolean' },
      },
    },
  },
};

export const getDefaultConnectionSchema = {
  tags: ['Connections'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'google', 'groq', 'ollama', 'vertex_ai'],
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        provider: { type: 'string' },
        isDefault: { type: 'boolean' },
      },
    },
  },
};

export const getProviderInfoSchema = {
  tags: ['Connections'],
  params: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'google', 'groq', 'ollama', 'vertex_ai'],
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        displayName: { type: 'string' },
        requiresApiKey: { type: 'boolean' },
        defaultModel: { type: 'string' },
        customizable: { type: 'boolean' },
      },
    },
  },
};

export const getProvidersSchema = {
  tags: ['Connections'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          displayName: { type: 'string' },
          requiresApiKey: { type: 'boolean' },
          defaultModel: { type: 'string' },
          customizable: { type: 'boolean' },
        },
      },
    },
  },
};

export const getProviderModelsSchema = {
  tags: ['Connections'],
  params: {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['openai', 'anthropic', 'google', 'groq', 'ollama', 'vertex_ai'],
      },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          contextWindow: { type: 'number' },
          maxTokens: { type: 'number' },
        },
      },
    },
  },
};