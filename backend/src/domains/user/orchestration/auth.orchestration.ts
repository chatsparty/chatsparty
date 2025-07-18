import { AuthProviderType } from '@prisma/client';
import { generateToken } from '../../../middleware/auth';
import { verifyPassword } from '../../../utils/crypto';
import {
  findUserByEmail,
  findUserByProvider,
  createUser,
  createGoogleUser,
  updateUserProvider,
  toPublicUser,
} from '../repository';
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ServiceResponse,
} from '../types';

export const registerUser = async (
  credentials: RegisterCredentials
): Promise<ServiceResponse<AuthResponse>> => {
  try {
    const existingUser = await findUserByEmail(credentials.email);

    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      };
    }

    const user = await createUser(credentials);
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const publicUser = toPublicUser(user);

    return {
      success: true,
      data: {
        user: publicUser,
        token,
      },
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      error: 'Failed to register user',
    };
  }
};

export const loginUser = async (
  credentials: LoginCredentials
): Promise<ServiceResponse<AuthResponse>> => {
  try {
    const user = await findUserByEmail(credentials.email);

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    if (user.provider === AuthProviderType.GOOGLE && !user.password) {
      return {
        success: false,
        error:
          'This account is registered with Google. Please use Google to sign in.',
      };
    }

    if (!user.password) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    const isValid = await verifyPassword(credentials.password, user.password);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const publicUser = toPublicUser(user);

    return {
      success: true,
      data: {
        user: publicUser,
        token,
      },
    };
  } catch (error) {
    console.error('Error logging in user:', error);
    return {
      success: false,
      error: 'Failed to login',
    };
  }
};

export const loginWithGoogle = async (
  accessToken: string
): Promise<ServiceResponse<AuthResponse>> => {
  try {
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google.');
    }

    const payload = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      name?: string;
    };

    if (!payload || !payload.email || !payload.sub) {
      return { success: false, error: 'Invalid Google token' };
    }

    const { email, name, sub: providerId } = payload;

    let user = await findUserByProvider(AuthProviderType.GOOGLE, providerId);

    if (!user) {
      const existingLocalUser = await findUserByEmail(email);

      if (
        existingLocalUser &&
        existingLocalUser.provider === AuthProviderType.LOCAL
      ) {
        user = await updateUserProvider(
          existingLocalUser.id,
          AuthProviderType.GOOGLE,
          providerId
        );
      } else {
        user = await createGoogleUser(email, name, providerId);
      }
    }

    const appToken = generateToken({
      userId: user.id,
      email: user.email,
    });

    const publicUser = toPublicUser(user);

    return {
      success: true,
      data: {
        user: publicUser,
        token: appToken,
      },
    };
  } catch (error) {
    console.error('Error in loginWithGoogle:', error);
    return { success: false, error: 'Google authentication failed' };
  }
};
