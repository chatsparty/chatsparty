import { TransactionType, TransactionReason } from '../../domains/credit/types';

export const QueryOptionsSchema = {
  type: 'object',
  properties: {
    limit: { type: 'number' },
    offset: { type: 'number' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    transactionType: { type: 'string', enum: Object.values(TransactionType) },
    reason: { type: 'string', enum: Object.values(TransactionReason) },
    orderBy: { type: 'string', enum: ['createdAt', 'amount'] },
    orderDirection: { type: 'string', enum: ['asc', 'desc'] },
  },
};

export const AddCreditsBodySchema = {
  type: 'object',
  properties: {
    amount: { type: 'number' },
    transactionType: { type: 'string', enum: Object.values(TransactionType) },
    reason: { type: 'string', enum: Object.values(TransactionReason) },
    description: { type: 'string' },
    userId: { type: 'string' },
  },
  required: ['amount', 'transactionType', 'reason'],
};

export const CalculateCostBodySchema = {
  type: 'object',
  properties: {
    provider: { type: 'string' },
    modelName: { type: 'string' },
    messageCount: { type: 'number' },
    tokenCount: { type: 'number' },
  },
  required: ['provider', 'modelName'],
};

export const ModelPricingBodySchema = {
  type: 'object',
  properties: {
    provider: { type: 'string' },
    modelName: { type: 'string' },
    costPerMessage: { type: 'number' },
    costPer1kTokens: { type: ['number', 'null'] },
    isDefaultModel: { type: 'boolean' },
    isActive: { type: 'boolean' },
  },
  required: ['provider', 'modelName', 'costPerMessage'],
};
