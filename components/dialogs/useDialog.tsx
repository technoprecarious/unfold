'use client';

import { useState, useCallback, useRef } from 'react';
import AlertDialog from './AlertDialog';
import ConfirmDialog from './ConfirmDialog';

export const useDialog = () => {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; title?: string }>({
    isOpen: false,
    message: '',
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    onConfirm?: () => void;
    $danger?: boolean;
  }>({
    isOpen: false,
    message: '',
  });

  const alertResolverRef = useRef<(() => void) | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const alert = useCallback((message: string, title?: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      alertResolverRef.current = resolve;
      setAlertState({ isOpen: true, message, title });
    });
  }, []);

  const confirm = useCallback((message: string, title?: string, $danger = false): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        isOpen: true,
        message,
        title,
        $danger,
        onConfirm: () => {
          setConfirmState({ isOpen: false, message: '', title: undefined, onConfirm: undefined });
          resolve(true);
          confirmResolverRef.current = null;
        },
      });
    });
  }, []);

  const handleAlertClose = () => {
    setAlertState({ isOpen: false, message: '', title: undefined });
    if (alertResolverRef.current) {
      alertResolverRef.current();
      alertResolverRef.current = null;
    }
  };

  const handleConfirmCancel = () => {
    setConfirmState({ isOpen: false, message: '', title: undefined, onConfirm: undefined });
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
      confirmResolverRef.current = null;
    }
  };

  const AlertComponent = () => (
    <AlertDialog
      isOpen={alertState.isOpen}
      message={alertState.message}
      title={alertState.title}
      onClose={handleAlertClose}
    />
  );

  const ConfirmComponent = () => (
    <ConfirmDialog
      isOpen={confirmState.isOpen}
      message={confirmState.message}
      title={confirmState.title}
      onConfirm={() => {
        if (confirmState.onConfirm) {
          confirmState.onConfirm();
        }
      }}
      onCancel={handleConfirmCancel}
      $danger={confirmState.$danger}
    />
  );

  return {
    alert,
    confirm,
    AlertComponent,
    ConfirmComponent,
  };
};





