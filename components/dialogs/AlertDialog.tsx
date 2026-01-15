'use client';

import React from 'react';
import styled from 'styled-components';
import Modal from './Modal';

// Constants
const DEFAULT_ALERT_TITLE = 'Alert';
const DEFAULT_MODAL_WIDTH = '400px';
const BUTTON_TEXT_OK = 'OK';

interface AlertDialogProps {
  isOpen: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ 
  isOpen, 
  message, 
  title = DEFAULT_ALERT_TITLE, 
  onClose 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={DEFAULT_MODAL_WIDTH}>
      <AlertMessage role="alert" aria-live="polite">
        {message}
      </AlertMessage>
      <AlertActions>
        <AlertButton 
          onClick={onClose}
          type="button"
          aria-label="Close alert"
        >
          {BUTTON_TEXT_OK}
        </AlertButton>
      </AlertActions>
    </Modal>
  );
};

export default AlertDialog;

const AlertMessage = styled.div`
  margin-bottom: 1.5rem;
  line-height: 1.6;
  color: var(--text-primary, #DEDEE5);
`;

const AlertActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const AlertButton = styled.button`
  background: var(--bg-tertiary, #2a2a2d);
  border: var(--border-width) solid var(--border-tertiary, #3a3a3d);
  color: var(--text-primary, #DEDEE5);
  padding: 0.5rem 1.5rem;
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-hover, #3a3a3d);
    border-color: var(--border-secondary, #4a4a4d);
    color: var(--text-primary, #DEDEE5);
  }
`;






