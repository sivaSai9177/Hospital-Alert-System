import { useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';

interface UseActivityAwareEscalationOptions {
  onInactive?: () => void;
  onActive?: () => void;
  inactivityTimeout?: number;
}

export function useActivityAwareEscalation(
  nextEscalationAt: Date | null,
  options: UseActivityAwareEscalationOptions = {}
) {
  const { onInactive, onActive, inactivityTimeout = 30000 } = options;
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!nextEscalationAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = Date.now();
      const target = new Date(nextEscalationAt).getTime();
      const remaining = Math.max(0, target - now);
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [nextEscalationAt]);

  // Activity detection
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      
      if (isPaused) {
        setIsPaused(false);
        onActive?.();
      }

      // Reset inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        setIsPaused(true);
        onInactive?.();
      }, inactivityTimeout);
    };

    // Listen for user activity - only on web platform
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      // Initial activity check
      handleActivity();

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    } else {
      // For mobile platforms, just run the initial activity check
      handleActivity();
      
      return () => {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    }
  }, [isPaused, onInactive, onActive, inactivityTimeout]);

  return {
    timeRemaining,
    isPaused,
    isActive: !isPaused
  };
}