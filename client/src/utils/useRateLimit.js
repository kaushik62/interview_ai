import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useRateLimit = (options = {}) => {
  const {
    defaultDuration = 900, // 15 minutes
    storageKey = 'rate_limit'
  } = options;

  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef(null);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Start the countdown timer
  const startTimer = useCallback((initialSeconds) => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let currentSeconds = initialSeconds;

    timerRef.current = setInterval(() => {
      currentSeconds--;
      
      if (currentSeconds <= 0) {
        // Timer finished
        clearInterval(timerRef.current);
        setIsRateLimited(false);
        setRemainingTime(0);
        localStorage.removeItem(storageKey);
      } else {
        // Update remaining time
        setRemainingTime(currentSeconds);
        
        // Update localStorage every second
        const newExpiryTime = Date.now() + (currentSeconds * 1000);
        localStorage.setItem(storageKey, JSON.stringify({
          expiryTime: newExpiryTime
        }));
      }
    }, 1000);
  }, [storageKey]);

  // Load saved rate limit on page load
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      const { expiryTime } = JSON.parse(saved);
      const now = Date.now();
      
      // If still within time limit
      if (expiryTime > now) {
        const remaining = Math.floor((expiryTime - now) / 1000);
        setIsRateLimited(true);
        setRemainingTime(remaining);
        // Start the timer with remaining seconds
        startTimer(remaining);
      } else {
        // Expired, clean up
        localStorage.removeItem(storageKey);
        setIsRateLimited(false);
        setRemainingTime(0);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [storageKey, startTimer]);

  // Start rate limiting (called when API returns 429)
  const startRateLimit = useCallback((durationSeconds = defaultDuration, errorMessage = null) => {
    // Show error message
    if (errorMessage) {
      toast.error(errorMessage);
    }
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Set state
    setIsRateLimited(true);
    setRemainingTime(durationSeconds);
    
    // Save to localStorage
    const expiryTime = Date.now() + (durationSeconds * 1000);
    localStorage.setItem(storageKey, JSON.stringify({
      expiryTime: expiryTime
    }));
    
    // Start timer
    let currentSeconds = durationSeconds;
    
    timerRef.current = setInterval(() => {
      currentSeconds--;
      
      if (currentSeconds <= 0) {
        clearInterval(timerRef.current);
        setIsRateLimited(false);
        setRemainingTime(0);
        localStorage.removeItem(storageKey);
      } else {
        setRemainingTime(currentSeconds);
        
        // Update localStorage every second
        const newExpiryTime = Date.now() + (currentSeconds * 1000);
        localStorage.setItem(storageKey, JSON.stringify({
          expiryTime: newExpiryTime
        }));
      }
    }, 1000);
  }, [defaultDuration, storageKey]);

  // Handle API error (automatically detects 429)
  const handleError = useCallback((error) => {
    if (error.response?.status === 429) {
      const message = error.response?.data?.error || 'Too many attempts. Please try again later.';
      startRateLimit(defaultDuration, message);
      return true;
    }
    return false;
  }, [defaultDuration, startRateLimit]);

  // Reset rate limit
  const resetRateLimit = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRateLimited(false);
    setRemainingTime(0);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    isRateLimited,
    remainingTime,
    formatTime,
    handleError,
    resetRateLimit,
    startRateLimit
  };
};