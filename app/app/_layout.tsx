import { Stack } from "expo-router";
import * as eva from '@eva-design/eva';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { theme } from '../theme';

export default function RootLayout() {
  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
        <Stack screenOptions={{ headerShown: false }} />
      </ApplicationProvider>
    </>
  );
}
