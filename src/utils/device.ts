import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function useDeviceType() {
  const [isMobile, setIsMobile] = useState<boolean>(true);
  const [isNative, setIsNative] = useState<boolean>(false);

  useEffect(() => {
    // Check if running on native platform (Android/iOS)
    const platform = Capacitor.getPlatform();
    const isNativeApp = platform === 'android' || platform === 'ios';
    setIsNative(isNativeApp);

    // If native app, always use mobile view
    if (isNativeApp) {
      setIsMobile(true);
      return;
    }

    // For web, detect screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint in Tailwind
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isMobile, isNative };
}

export function getDeviceClass() {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios' ? 'native' : 'web';
}
