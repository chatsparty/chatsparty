import {
  findUserById,
  updateUser,
  updateUserPassword,
  deleteUser,
  listUsers,
  toPublicUser,
  findUserByEmail,
} from '../repository';
import {
  User,
  UserWithCredits,
  ServiceResponse,
  UserQueryOptions,
  PaginationOptions,
  PublicUser,
} from '../types';
import { hashPassword, verifyPassword } from '../../../utils/crypto';

export const getUserById = async (
  userId: string,
  options: UserQueryOptions = {}
): Promise<ServiceResponse<UserWithCredits | User>> => {
  try {
    const user = await findUserById(userId, options);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return {
      success: false,
      error: 'Failed to get user',
    };
  }
};

export const updateUserService = async (
  userId: string,
  data: { name?: string; email?: string }
): Promise<ServiceResponse<User>> => {
  try {
    if (data.email) {
      const existingUser = await findUserByEmail(data.email);

      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'Email already in use',
        };
      }
    }

    const user = await updateUser(userId, data);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: 'Failed to update user',
    };
  }
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ServiceResponse<void>> => {
  try {
    const user = await findUserById(userId);

    if (!user || !user.password) {
      return {
        success: false,
        error: 'User not found or no password set',
      };
    }

    const isValid = await verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return {
        success: false,
        error: 'Current password is incorrect',
      };
    }

    const hashedPassword = await hashPassword(newPassword);

    await updateUserPassword(userId, hashedPassword);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      error: 'Failed to change password',
    };
  }
};

export const deleteUserService = async (
  userId: string
): Promise<ServiceResponse<void>> => {
  try {
    await deleteUser(userId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: 'Failed to delete user',
    };
  }
};

export const listUsersService = async (
  options: PaginationOptions = {}
): Promise<
  ServiceResponse<{
    users: PublicUser[];
    total: number;
  }>
> => {
  try {
    const { users, total } = await listUsers(options);
    const publicUsers = users.map(toPublicUser);

    return {
      success: true,
      data: {
        users: publicUsers,
        total,
      },
    };
  } catch (error) {
    console.error('Error listing users:', error);
    return {
      success: false,
      error: 'Failed to list users',
    };
  }
};
