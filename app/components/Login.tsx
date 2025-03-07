/**
 * Login component for Firebase authentication
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Button, Card, Text, Avatar, Spinner } from '@ui-kitten/components';
import { UserInfo } from '../api/ApiInterface';
import { ApiProvider } from '../api/ApiProvider';

interface LoginProps {
  onLoginStateChange?: (isLoggedIn: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginStateChange }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const apiProvider = ApiProvider.getInstance();
    const apiClient = apiProvider.getApiClient();
    
    if (apiClient?.getCurrentUser) {
      const currentUser = apiClient.getCurrentUser();
      setUser(currentUser);
      if (onLoginStateChange) {
        onLoginStateChange(!!currentUser);
      }
    }
    
    // Set up auth state listener
    if (apiClient?.onAuthStateChanged) {
      const unsubscribe = apiClient.onAuthStateChanged((user) => {
        setUser(user);
        if (onLoginStateChange) {
          onLoginStateChange(!!user);
        }
      });
      
      return () => unsubscribe();
    }
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiProvider = ApiProvider.getInstance();
      const apiClient = apiProvider.getApiClient();
      
      if (apiClient?.signInWithGoogle) {
        const user = await apiClient.signInWithGoogle();
        setUser(user);
        if (onLoginStateChange) {
          onLoginStateChange(true);
        }
      } else {
        setError('Google Sign-In is not supported by this API provider');
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    
    try {
      const apiProvider = ApiProvider.getInstance();
      const apiClient = apiProvider.getApiClient();
      
      if (apiClient?.signOut) {
        await apiClient.signOut();
        setUser(null);
        if (onLoginStateChange) {
          onLoginStateChange(false);
        }
      }
    } catch (error) {
      console.error('Sign-out error:', error);
      setError('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <Card style={styles.card}>
        <View style={styles.userContainer}>
          {user.photoURL ? (
            <Avatar 
              source={{ uri: user.photoURL }} 
              size="medium"
              style={styles.avatar}
            />
          ) : (
            <Avatar 
              size="medium"
              style={styles.avatar}
            />
          )}
          <View style={styles.userInfo}>
            <Text category="s1">{user.displayName}</Text>
            <Text category="c1" appearance="hint">{user.email}</Text>
          </View>
          <Button
            size="small"
            status="basic"
            onPress={handleSignOut}
            disabled={loading}
            accessoryRight={loading ? () => <Spinner size="small" /> : undefined}
          >
            Sign Out
          </Button>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text category="h6" style={styles.title}>Sign In to Continue</Text>
      <Text appearance="hint" style={styles.subtitle}>
        Sign in to create and join rooms, and to persist your settings.
      </Text>
      
      <Button
        appearance="outline"
        status="info"
        onPress={handleSignIn}
        disabled={loading}
        accessoryLeft={loading ? () => <Spinner size="small" /> : undefined}
        style={styles.button}
      >
        Sign in with Google
      </Button>
      
      {error && (
        <Text status="danger" style={styles.error}>
          {error}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
    marginHorizontal: 10,
  },
  title: {
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    marginVertical: 10,
  },
  error: {
    marginTop: 10,
    textAlign: 'center',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
});