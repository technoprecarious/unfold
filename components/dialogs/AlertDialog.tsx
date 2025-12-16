'use client';

import React from 'react';
import styled from 'styled-components';
import Modal from './Modal';

interface AlertDialogProps {
  isOpen: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, message, title = 'Alert', onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="400px">
      <AlertMessage>{message}</AlertMessage>
      <AlertActions>
        <AlertButton onClick={onClose}>OK</AlertButton>
      </AlertActions>
    </Modal>
  );
};

export default AlertDialog;

const AlertMessage = styled.div`
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

const AlertActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const AlertButton = styled.button`
  background: #2a2a2d;
  border: 1px solid #3a3a3d;
  color: #DEDEE5;
  padding: 0.5rem 1.5rem;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3a3a3d;
    border-color: #4a4a4d;
  }
`;






