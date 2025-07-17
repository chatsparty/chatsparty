import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../hooks/use-auth';
import { theme } from '../constants/theme';

export default function HomeScreen() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to ChatsParty!</Text>
        
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>Hello, {user.name || user.email}!</Text>
            <Text style={styles.emailText}>{user.email}</Text>
          </View>
        )}

        <Text style={styles.description}>
          You're successfully signed in. This is where the main app content will go.
        </Text>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={styles.logoutButtonText}>
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});