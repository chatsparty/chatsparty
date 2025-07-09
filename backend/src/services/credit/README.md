# Credit Service

The Credit Service manages user credits, transactions, and model pricing for the ChatsParty system.

## Overview

The service consists of two main components:

1. **CreditService**: Manages user credit balances, transactions, and usage tracking
2. **ModelPricingService**: Manages pricing for different AI models

## Features

### Credit Management
- Track user credit balance, usage, and purchases
- Create credit transactions with full audit trail
- Support for different transaction types (purchase, usage, refund, bonus, etc.)
- Automatic balance validation before usage
- Transaction history with filtering and pagination

### Model Pricing
- Configure credit costs per model and provider
- Support for both per-message and per-token pricing
- Default model pricing for providers
- Cost calculation based on usage
- Caching for improved performance

## Usage

### Credit Service

```typescript
import { CreditService, TransactionReason } from '../services/credit/index.js';

const creditService = new CreditService();

// Get user's credit balance
const balance = await creditService.getCreditBalance(userId);

// Use credits for AI chat
const transaction = await creditService.useCredits({
  userId,
  amount: 10,
  reason: TransactionReason.AI_CHAT,
  description: 'Chat with GPT-4',
  metadata: {
    modelName: 'gpt-4',
    provider: 'openai',
    conversationId: 'conv123'
  }
});

// Add credits (e.g., after purchase)
const transaction = await creditService.addCredits({
  userId,
  amount: 1000,
  transactionType: TransactionType.PURCHASE,
  reason: TransactionReason.MANUAL_ADJUSTMENT,
  description: 'Credit purchase - Premium plan'
});

// Validate credits before usage
const validation = await creditService.validateCredits(userId, 50);
if (validation.data?.hasEnoughCredits) {
  // Proceed with the operation
}

// Get transaction history
const history = await creditService.getTransactionHistory({
  userId,
  limit: 20,
  offset: 0,
  orderBy: 'createdAt',
  orderDirection: 'desc'
});
```

### Model Pricing Service

```typescript
import { ModelPricingService } from '../services/credit/index.js';

const pricingService = new ModelPricingService();

// Get pricing for a specific model
const pricing = await pricingService.getModelPricing('openai', 'gpt-4');

// Calculate cost for usage
const cost = await pricingService.calculateCost({
  provider: 'openai',
  modelName: 'gpt-4-turbo',
  messageCount: 1,
  tokenCount: 1500
});

// List all active pricing
const allPricing = await pricingService.listModelPricing({
  isActive: true
});
```

## API Endpoints

### Credit Endpoints

- `GET /api/credits/balance` - Get current user's credit balance
- `GET /api/credits/transactions` - Get transaction history
- `GET /api/credits/statistics` - Get credit usage statistics
- `POST /api/credits/validate` - Validate if user has enough credits
- `POST /api/credits/calculate-cost` - Calculate cost for model usage
- `POST /api/credits/add` - Add credits to account (admin)

### Pricing Endpoints

- `GET /api/credits/pricing` - List all model pricing
- `GET /api/credits/pricing/:provider/:modelName` - Get specific model pricing
- `POST /api/credits/pricing` - Create/update model pricing (admin)
- `DELETE /api/credits/pricing/:provider/:modelName` - Delete model pricing (admin)
- `POST /api/credits/pricing/initialize` - Initialize default pricing (admin)

## Transaction Types

- `PURCHASE` - Credit purchase
- `USAGE` - Credit usage for services
- `REFUND` - Credit refund
- `BONUS` - Bonus credits (welcome, referral, etc.)
- `SUBSCRIPTION` - Subscription-based credits
- `REFILL` - Subscription refill
- `ADJUSTMENT` - Manual adjustment

## Transaction Reasons

- `AI_CHAT` - AI chat usage
- `MODEL_USAGE` - Direct model API usage
- `VOICE_SYNTHESIS` - Voice synthesis
- `PODCAST_GENERATION` - Podcast generation
- `MANUAL_ADJUSTMENT` - Manual adjustment by admin
- `SUBSCRIPTION_REFILL` - Monthly subscription refill
- `WELCOME_BONUS` - New user welcome bonus
- `REFERRAL_BONUS` - Referral bonus

## Default Model Pricing

The service includes default pricing for popular models:

### OpenAI
- GPT-4: 30 credits per message
- GPT-4 Turbo: 10 credits per message (default)
- GPT-3.5 Turbo: 1 credit per message

### Anthropic
- Claude 3 Opus: 60 credits per message
- Claude 3 Sonnet: 15 credits per message (default)
- Claude 3 Haiku: 1 credit per message

### Google
- Gemini Pro: 5 credits per message (default)
- Gemini Pro Vision: 10 credits per message

### Groq
- Mixtral 8x7B: 1 credit per message (default)
- Llama 2 70B: 1 credit per message

### Ollama (Local)
- All models: 1 credit per message

## Integration with Other Services

The credit service integrates with:

1. **User Service**: Updates user credit balance fields
2. **AI/Chat Services**: Deducts credits for model usage
3. **Auth Middleware**: Validates user authentication

## Error Handling

All service methods return a `ServiceResponse<T>` object:

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Always check the `success` field before using the `data`.

## Database Schema

The service uses two main Prisma models:

1. **CreditTransaction**: Stores all credit transactions
2. **ModelCreditCost**: Stores model pricing configuration

User credit balance is stored directly in the User model:
- `creditsBalance`: Current balance
- `creditsUsed`: Total credits used
- `creditsPurchased`: Total credits purchased
- `creditPlan`: User's credit plan
- `lastCreditRefillAt`: Last refill date