import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as eva from '@eva-design/eva';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { ApplicationProvider, IconRegistry, Spinner, Layout } from '@ui-kitten/components';
import { theme } from '../theme';
import { ApiProvider } from '../api/ApiProvider';
import { View, Text } from 'react-native';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);

  // Initialize Firebase and check auth state on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Firebase
        console.log('[App] Initializing Firebase on app start');
        const provider = ApiProvider.getInstance();
        await provider.initialize();

        console.log('[App] Firebase initialized');
      } catch (error) {
        console.error('[App] Error initializing Firebase:', error);
      } finally {
        // Whether successful or not, we're done initializing
        setInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen during initialization
  if (initializing) {
    return (
      <>
        <IconRegistry icons={EvaIconsPack} />
        <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
          <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Spinner size="large" />
            <Text style={{ marginTop: 20 }}>Loading...</Text>
          </Layout>
        </ApplicationProvider>
      </>
    );
  }

  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
        <Stack screenOptions={{ headerShown: false }} />
      </ApplicationProvider>
    </>
  );
}
