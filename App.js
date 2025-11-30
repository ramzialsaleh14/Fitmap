import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { TranslationProvider } from './src/utils/Strings';

export default function App() {
  return (
    <>
      <TranslationProvider>
        <AppNavigator />
      </TranslationProvider>
      <StatusBar style="light" />
    </>
  );
}
