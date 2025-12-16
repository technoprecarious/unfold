'use client';

import React from 'react';
import styled from 'styled-components';
import Modal from './Modal';

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
  title = 'Unsaved Changes',
  onSave,
  onDiscard,
  onCancel,
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title={title} 
      width="420px"
    >
      <DialogMessage>{message}</DialogMessage>
      <DialogActions>
        <DialogButton onClick={onCancel} $secondary>
          Cancel
        </DialogButton>
        <ButtonGroup>
          <DialogButton onClick={onSave}>
            Save
          </DialogButton>
          <DialogButton onClick={onDiscard} $danger>
            Discard
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
  color: #DEDEE5;
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
    props.$danger ? '#3a1f1f' : 
    props.$secondary ? '#2a2a2d' : 
    '#2a2a2d'};
  border: 1px solid ${props => 
    props.$danger ? '#5a2f2f' : 
    props.$secondary ? '#3a3a3d' : 
    '#3a3a3d'};
  color: ${props => 
    props.$danger ? '#ff8888' : 
    props.$secondary ? '#8A8A95' : 
    '#DEDEE5'};
  padding: 0.625rem 1.5rem;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  text-align: center;

  &:hover {
    background: ${props => 
      props.$danger ? '#4a2f2f' : 
      props.$secondary ? '#3a3a3d' : 
      '#3a3a3d'};
    border-color: ${props => 
      props.$danger ? '#6a3f3f' : 
      props.$secondary ? '#4a4a4d' : 
      '#4a4a4d'};
    color: ${props => 
      props.$danger ? '#ffaaaa' : 
      props.$secondary ? '#DEDEE5' : 
      '#ffffff'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

