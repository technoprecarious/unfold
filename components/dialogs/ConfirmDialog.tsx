'use client';

import React from 'react';
import styled from 'styled-components';
import Modal from './Modal';

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
  title = 'Confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  $danger = false,
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title={title} 
      width="420px"
    >
      <ConfirmMessage>{message}</ConfirmMessage>
      <ConfirmActions>
        <ConfirmButton onClick={onCancel} $secondary>
          {cancelText}
        </ConfirmButton>
        <ConfirmButton onClick={onConfirm} $danger={$danger}>
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
  border: 1px solid ${props =>
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
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;
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






