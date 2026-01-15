'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// Constants
const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PLACEHOLDER_TIME = '--:--:--';
const PAD_LENGTH = 2;

const Clock: React.FC = () => {
  const [time, setTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only set time after component mounts on client to avoid hydration mismatch
    setMounted(true);
    setTime(new Date());
    
    const timer = setInterval(() => {
      setTime(new Date());
    }, CLOCK_UPDATE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  /**
   * Formats time to HH:MM:SS format
   */
  const formatTime = (date: Date | null): string => {
    if (!date) return PLACEHOLDER_TIME;
    const hours = date.getHours().toString().padStart(PAD_LENGTH, '0');
    const minutes = date.getMinutes().toString().padStart(PAD_LENGTH, '0');
    const seconds = date.getSeconds().toString().padStart(PAD_LENGTH, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Don't render time until mounted to avoid hydration mismatch
  // Show placeholder during SSR
  if (!mounted) {
    return (
      <ClockDisplay 
        suppressHydrationWarning
        role="timer"
        aria-live="polite"
        aria-label="Current time"
      >
        {PLACEHOLDER_TIME}
      </ClockDisplay>
    );
  }

  return (
    <ClockDisplay 
      suppressHydrationWarning
      role="timer"
      aria-live="polite"
      aria-label="Current time"
    >
      {formatTime(time)}
    </ClockDisplay>
  );
};

export default Clock;

const ClockDisplay = styled.div`
  font-family: var(--font-family-base);
  font-size: var(--font-size-md);
  font-weight: normal;
  color: var(--text-primary, #DEDEE5);
  letter-spacing: 0.1em;
  line-height: var(--font-size-md);
  text-transform: uppercase;
  
  /* Absolute black in light mode */
  [data-theme="light"] & {
    color: #000000;
  }
`;

