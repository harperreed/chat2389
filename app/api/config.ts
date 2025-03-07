/**
 * API configuration for various backend providers
 */

import { FirebaseOptions } from 'firebase/app';

interface ApiConfig {
  firebase: FirebaseOptions;
  pocketbase: {
    baseUrl: string;
  };
  flask: {
    baseUrl: string;
  };
}

export const config: ApiConfig = {
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL"
  },
  pocketbase: {
    baseUrl: "http://localhost:8090"
  },
  flask: {
    baseUrl: "http://localhost:5000"
  }
};