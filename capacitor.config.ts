import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.resourcecalc',
  appName: 'ResourceCalc',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
