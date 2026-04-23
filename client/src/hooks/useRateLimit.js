import { useState, useEffect, useRef } from 'react';

export const useRateLimit = (feature = 'auth') => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const timerRef = useRef(null);

  // Get storage key based on feature
  const getStorageKey = () => {
    switch(feature) {
      case 'auth': return 'rateLimit_auth';
      case 'quiz': return 'rateLimit_quiz';
      case 'ai': return 'rateLimit_ai';
      case 'dailyChallenge': return 'rateLimit_daily';
      default: return 'rateLimit_default';
    }
  };

  // Load saved rate limit from localStorage on page load
  useEffect(() => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { expiryTime, message } = JSON.parse(saved);
      const now = Date.now();
      
      if (expiryTime > now) {
        const remaining = Math.floor((expiryTime - now) / 1000);
        setRemainingSeconds(remaining);
        setIsBlocked(true);
        setErrorMessage(message);
        startTimer(remaining);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [feature]);

  const startTimer = (seconds) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    let currentSeconds = seconds;
    const storageKey = getStorageKey();
    
    timerRef.current = setInterval(() => {
      currentSeconds--;
      
      if (currentSeconds <= 0) {
        clearInterval(timerRef.current);
        setIsBlocked(false);
        setRemainingSeconds(0);
        setErrorMessage('');
        localStorage.removeItem(storageKey);
      } else {
        setRemainingSeconds(currentSeconds);
        // Update localStorage every second
        const expiryTime = Date.now() + (currentSeconds * 1000);
        localStorage.setItem(storageKey, JSON.stringify({ expiryTime, message: errorMessage }));
      }
    }, 1000);
  };

  const handleRateLimit = (error) => {
    if (error.response?.status === 429) {
      // Get retry time from backend headers
      const retryAfter = error.response.headers['retry-after'];
      let seconds = 60; // Default fallback
      
      // Determine seconds based on URL or retry-after header
      const url = error.config?.url || '';
      
      if (retryAfter) {
        seconds = parseInt(retryAfter);
      } else {
        // Fallback based on endpoint
        if (url.includes('/auth/login') || url.includes('/auth/register')) {
          seconds = 300; // 5 minute for auth
        } else if (url.includes('/mcq/generate')) {
          seconds = 3600; // 1 hour for AI generation
        } else if (url.includes('/daily-challenge/submit')) {
          seconds = 86400; // 24 hours for daily challenge
        } else if (url.includes('/submit')) {
          seconds = 3600; // 1 hour for quiz submissions
        }
      }
      
      // Get error message from backend
      const message = error.response?.data?.error || 'Too many requests';
      setErrorMessage(message);
      
      setIsBlocked(true);
      setRemainingSeconds(seconds);
      
      // Save to localStorage with feature-specific key
      const storageKey = getStorageKey();
      const expiryTime = Date.now() + (seconds * 1000);
      localStorage.setItem(storageKey, JSON.stringify({ expiryTime, message }));
      
      // Start timer
      startTimer(seconds);
      
      return true;
    }
    return false;
  };

  const formatTime = () => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeLong = () => {
    const mins = Math.floor(remainingSeconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} minute${remainingMins > 1 ? 's' : ''}`;
    }
    if (mins > 0) {
      return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
    return `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
  };

  const resetBlock = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsBlocked(false);
    setRemainingSeconds(0);
    setErrorMessage('');
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
  };

  return { 
    isBlocked, 
    timeLeft: formatTime(), 
    timeLeftLong: formatTimeLong(),
    errorMessage,
    handleRateLimit, 
    resetBlock 
  };
};