'use client';

import React from 'react';
import styled from 'styled-components';
import Modal from './Modal';

// Constants
const DEFAULT_CONFIRM_TITLE = 'Confirm';
const DEFAULT_CONFIRM_TEXT = 'Confirm';
const DEFAULT_CANCEL_TEXT = 'Cancel';
const CONFIRM_MODAL_WIDTH = '420px';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  $danger?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  message,
  title = DEFAULT_CONFIRM_TITLE,
  confirmText = DEFAULT_CONFIRM_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  onConfirm,
  onCancel,
  $danger = false,
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title={title} 
      width={CONFIRM_MODAL_WIDTH}
    >
      <ConfirmMessage role="alert" aria-live="polite">
        {message}
      </ConfirmMessage>
      <ConfirmActions>
        <ConfirmButton 
          onClick={onCancel} 
          $secondary
          type="button"
          aria-label={cancelText}
        >
          {cancelText}
        </ConfirmButton>
        <ConfirmButton 
          onClick={onConfirm} 
          $danger={$danger}
          type="button"
          aria-label={confirmText}
        >
          {confirmText}
        </ConfirmButton>
      </ConfirmActions>
    </Modal>
  );
};

export default ConfirmDialog;

const ConfirmMessage = styled.div`
  margin-bottom: 1.5rem;
  line-height: 1.6;
  color: var(--text-primary, #DEDEE5);
`;

const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ConfirmButton = styled.button<{ $secondary?: boolean; $danger?: boolean }>`
  background: ${props =>
    props.$danger
      ? 'var(--danger-bg, #3a1f1f)'
      : props.$secondary
      ? 'var(--bg-tertiary, #2a2a2d)'
      : 'var(--bg-tertiary, #2a2a2d)'};
  border: var(--border-width) solid ${props =>
    props.$danger
      ? 'var(--danger-border, #5a2f2f)'
      : props.$secondary
      ? 'var(--border-tertiary, #3a3a3d)'
      : 'var(--border-tertiary, #3a3a3d)'};
  color: ${props =>
    props.$danger
      ? 'var(--danger-text, #ff6a6a)'
      : props.$secondary
      ? 'var(--text-secondary, #8A8A95)'
      : 'var(--text-primary, #DEDEE5)'};
  padding: 0.625rem 1.5rem;
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 80px;
  text-align: center;

  &:hover {
    background: ${props =>
      props.$danger
        ? 'var(--danger-bg-hover, #4a2f2f)'
        : props.$secondary
        ? 'var(--bg-hover, #3a3a3d)'
        : 'var(--bg-hover, #3a3a3d)'};
    border-color: ${props =>
      props.$danger
        ? 'var(--danger-border-hover, #6a3f3f)'
        : props.$secondary
        ? 'var(--border-secondary, #4a4a4d)'
        : 'var(--border-secondary, #4a4a4d)'};
    color: ${props =>
      props.$danger
        ? 'var(--danger-text-hover, #ffaaaa)'
        : 'var(--text-primary, #DEDEE5)'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;






