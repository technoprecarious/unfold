'use client';

import React, { useEffect } from 'react';
import styled from 'styled-components';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, width = '400px' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent 
        onClick={(e) => e.stopPropagation()} 
        $width={width}
      >
        {title && (
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            <CloseButton onClick={onClose} aria-label="Close">×</CloseButton>
          </ModalHeader>
        )}
        <ModalBody>{children}</ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default Modal;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: var(--shadow-overlay-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-overlay);
  backdrop-filter: blur(4px);
  padding: var(--spacing-8);
  box-sizing: border-box;
`;

const ModalContent = styled.div<{ $width: string }>`
  background: var(--bg-secondary, #161619);
  border: 1px solid var(--border-primary, #2a2a2d);
  border-radius: var(--radius-none);
  width: ${props => props.$width};
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  position: relative;
  margin: auto;
  
  animation: modalFadeIn var(--transition-fast) ease-out;
  
  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-12);
  border-bottom: 1px solid var(--border-primary, #2a2a2d);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 400;
  color: var(--text-primary, #DEDEE5);
  font-family: var(--font-family-base);
  letter-spacing: var(--letter-spacing-normal);
  text-transform: uppercase;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: var(--font-size-2xl);
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: var(--font-size-2xl);
  height: var(--font-size-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
  font-family: var(--font-family-base);

  &:hover {
    color: var(--text-primary, #DEDEE5);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ModalBody = styled.div`
  padding: var(--spacing-12);
  color: var(--text-primary, #DEDEE5);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  overflow-y: auto;
  flex: 1;
  line-height: var(--line-height-relaxed);
`;






