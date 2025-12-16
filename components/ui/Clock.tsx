'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Clock: React.FC = () => {
  const [time, setTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only set time after component mounts on client to avoid hydration mismatch
    setMounted(true);
    setTime(new Date());
    
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Don't render time until mounted to avoid hydration mismatch
  // Show placeholder during SSR
  if (!mounted) {
    return <ClockDisplay suppressHydrationWarning>--:--:--</ClockDisplay>;
  }

  return <ClockDisplay suppressHydrationWarning>{formatTime(time)}</ClockDisplay>;
};

export default Clock;

const ClockDisplay = styled.div`
  font-family: Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: normal;
  color: var(--text-primary, #DEDEE5);
  letter-spacing: 0.1em;
  line-height: 12px;
  text-transform: uppercase;
  
  /* Absolute black in light mode */
  [data-theme="light"] & {
    color: #000000;
  }
`;

