# User Service

The User Service handles user authentication, profile management, and credit system operations.

## Features

- User registration and authentication
- Profile management
- Password management
- Credit system (balance, transactions)
- JWT-based authentication

## API Endpoints

### Authentication

#### Register User
- **POST** `/api/users/register`
- **Body**: `{ email: string, password: string, name?: string }`
- **Response**: `{ user: PublicUser, token: string }`

#### Login User
- **POST** `/api/users/login`
- **Body**: `{ email: string, password: string }`
- **Response**: `{ user: PublicUser, token: string }`

### User Profile

#### Get Current User
- **GET** `/api/users/me`
- **Auth**: Required
- **Response**: User object with credits

#### Update Current User
- **PATCH** `/api/users/me`
- **Auth**: Required
- **Body**: `{ name?: string, email?: string }`
- **Response**: Updated user object

#### Change Password
- **POST** `/api/users/me/change-password`
- **Auth**: Required
- **Body**: `{ currentPassword: string, newPassword: string }`
- **Response**: Success message

#### Delete Current User
- **DELETE** `/api/users/me`
- **Auth**: Required
- **Response**: 204 No Content

### Credit System

#### Get Credit Balance
- **GET** `/api/users/me/credits`
- **Auth**: Required
- **Response**: `{ total: number, used: number, remaining: number, credits: CreditDetails[] }`

#### Add Credits
- **POST** `/api/users/me/credits`
- **Auth**: Required
- **Body**: `{ amount: number, type: 'subscription' | 'topup' | 'bonus', expiresAt?: Date }`
- **Response**: Created credit details

#### Use Credits
- **POST** `/api/users/me/credits/use`
- **Auth**: Required
- **Body**: `{ amount: number, description?: string }`
- **Response**: Updated credit balance

### User Data

#### Get User by ID
- **GET** `/api/users/:id`
- **Auth**: Required
- **Note**: Currently restricted to viewing own profile only

#### Get User's Agents
- **GET** `/api/users/:id/agents`
- **Auth**: Required
- **Note**: Currently restricted to viewing own agents only

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  provider: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Credit
```typescript
interface Credit {
  id: string;
  userId: string;
  amount: number;
  used: number;
  remaining: number;
  type: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## Password Requirements

- Minimum 8 characters
- Maximum 100 characters
- Must contain at least:
  - One uppercase letter
  - One lowercase letter
  - One number

## Credit System Rules

1. Credits are deducted using FIFO (First In, First Out)
2. Credits with expiration dates are used first
3. New users receive 100 bonus credits valid for 30 days
4. Credit types: `subscription`, `topup`, `bonus`