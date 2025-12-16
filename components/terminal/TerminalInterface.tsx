'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';

// Dynamically import xterm only on client side to avoid SSR issues
const TerminalComponent = dynamic(() => import('./TerminalComponent'), {
  ssr: false,
  loading: () => <TerminalPlaceholder>Loading terminal...</TerminalPlaceholder>
});

interface TerminalInterfaceProps {
  onDataUpdate: () => void;
}

const TerminalInterface: React.FC<TerminalInterfaceProps> = ({ onDataUpdate }) => {
  return (
    <TerminalContainer>
      <TerminalComponent onDataUpdate={onDataUpdate} />
    </TerminalContainer>
  );
};

export default TerminalInterface;

const TerminalContainer = styled.div`
  display: flex;
  width: 70%;
  height: 550px;
  max-width: 70%;
  max-height: 550px;
  background: #000000;
  border: none;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  box-sizing: border-box;

  .xterm {
    display: block;
    width: 100%;
    height: 100%;
    padding: 1rem;
    padding-bottom: 2rem !important; /* Extra bottom padding to ensure cursor is visible */
    box-sizing: border-box;
    line-height: 1.2 !important; /* Reduce line height for tighter spacing */
  }

  .xterm-viewport {
    background-color: #000000 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    width: 100% !important;
    box-sizing: border-box !important;
    /* Ensure viewport can scroll to show full content */
    scroll-behavior: auto !important;
    
    /* Hide scrollbar completely - Webkit browsers */
    &::-webkit-scrollbar {
      width: 0px;
      background: transparent;
      display: none;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
      display: none;
    }
    
    &::-webkit-scrollbar-thumb {
      background: transparent;
      opacity: 0;
      display: none;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: transparent;
      opacity: 0;
    }
    
    /* Hide scrollbar completely - Firefox */
    scrollbar-width: none;
    scrollbar-color: transparent transparent;
    
    /* Hide scrollbar - IE and Edge */
    -ms-overflow-style: none;
  }
  
  .xterm-screen {
    background-color: #000000 !important;
    width: 100% !important;
    box-sizing: border-box !important;
    /* Ensure text wraps properly */
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }
  
  .xterm-rows {
    /* Ensure rows handle wrapping */
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    line-height: 1.2 !important; /* Reduce line height for tighter spacing */
  }
  
  .xterm-text-layer {
    /* Ensure text layer wraps */
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    white-space: pre-wrap !important; /* Preserve whitespace but allow wrapping */
    line-height: 1.2 !important; /* Reduce line height for tighter spacing */
  }
  
  .xterm-char-measure-element {
    line-height: 1.2 !important; /* Reduce line height for character measurement */
  }
  
  .xterm-cursor-layer {
    z-index: 2;
  }
`;

const TerminalPlaceholder = styled.div`
  width: 500px;
  height: 550px;
  background: #000000;
  border: none;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #DEDEE5;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 12px;
  line-height: 12px;
`;

