import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.techworld.familyexpenses',
  appName: 'Family Expenses',
  webDir: 'dist',
  server: {
    // Use http so Android WebView can reach an HTTP Express backend during dev.
    // Switch to https and deploy the backend to TLS for production.
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
