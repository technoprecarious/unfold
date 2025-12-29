'use client';

import React from 'react';
import styled from 'styled-components';
import Modal from './Modal';

// Constants
const DEFAULT_TITLE = 'Unsaved Changes';
const SAVE_DISCARD_MODAL_WIDTH = '420px';
const BUTTON_TEXT_CANCEL = 'Cancel';
const BUTTON_TEXT_SAVE = 'Save';
const BUTTON_TEXT_DISCARD = 'Discard';

interface SaveDiscardDialogProps {
  isOpen: boolean;
  message: string;
  title?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const SaveDiscardDialog: React.FC<SaveDiscardDialogProps> = ({
  isOpen,
  message,
  title = DEFAULT_TITLE,
  onSave,
  onDiscard,
  onCancel,
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title={title} 
      width={SAVE_DISCARD_MODAL_WIDTH}
    >
      <DialogMessage role="alert" aria-live="polite">
        {message}
      </DialogMessage>
      <DialogActions>
        <DialogButton 
          onClick={onCancel} 
          $secondary
          type="button"
          aria-label={BUTTON_TEXT_CANCEL}
        >
          {BUTTON_TEXT_CANCEL}
        </DialogButton>
        <ButtonGroup>
          <DialogButton 
            onClick={onSave}
            type="button"
            aria-label={BUTTON_TEXT_SAVE}
          >
            {BUTTON_TEXT_SAVE}
          </DialogButton>
          <DialogButton 
            onClick={onDiscard} 
            $danger
            type="button"
            aria-label={BUTTON_TEXT_DISCARD}
          >
            {BUTTON_TEXT_DISCARD}
          </DialogButton>
        </ButtonGroup>
      </DialogActions>
    </Modal>
  );
};

export default SaveDiscardDialog;

const DialogMessage = styled.div`
  margin-bottom: 1.5rem;
  line-height: 1.6;
  color: var(--text-primary, #DEDEE5);
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const DialogButton = styled.button<{ $secondary?: boolean; $danger?: boolean }>`
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

