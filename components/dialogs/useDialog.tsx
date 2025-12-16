'use client';

import { useState, useCallback, useRef } from 'react';
import AlertDialog from './AlertDialog';
import ConfirmDialog from './ConfirmDialog';
import SaveDiscardDialog from './SaveDiscardDialog';

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

  const [saveDiscardState, setSaveDiscardState] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    onSave?: () => void;
    onDiscard?: () => void;
  }>({
    isOpen: false,
    message: '',
  });

  const alertResolverRef = useRef<(() => void) | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const saveDiscardResolverRef = useRef<((action: 'save' | 'discard' | 'cancel') => void) | null>(null);

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

  const saveDiscard = useCallback((message: string, title?: string): Promise<'save' | 'discard' | 'cancel'> => {
    return new Promise((resolve) => {
      saveDiscardResolverRef.current = resolve;
      setSaveDiscardState({
        isOpen: true,
        message,
        title,
        onSave: () => {
          setSaveDiscardState({ isOpen: false, message: '', title: undefined, onSave: undefined, onDiscard: undefined });
          resolve('save');
          saveDiscardResolverRef.current = null;
        },
        onDiscard: () => {
          setSaveDiscardState({ isOpen: false, message: '', title: undefined, onSave: undefined, onDiscard: undefined });
          resolve('discard');
          saveDiscardResolverRef.current = null;
        },
      });
    });
  }, []);

  const handleSaveDiscardCancel = () => {
    setSaveDiscardState({ isOpen: false, message: '', title: undefined, onSave: undefined, onDiscard: undefined });
    if (saveDiscardResolverRef.current) {
      saveDiscardResolverRef.current('cancel');
      saveDiscardResolverRef.current = null;
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

  const SaveDiscardComponent = () => (
    <SaveDiscardDialog
      isOpen={saveDiscardState.isOpen}
      message={saveDiscardState.message}
      title={saveDiscardState.title}
      onSave={() => {
        if (saveDiscardState.onSave) {
          saveDiscardState.onSave();
        }
      }}
      onDiscard={() => {
        if (saveDiscardState.onDiscard) {
          saveDiscardState.onDiscard();
        }
      }}
      onCancel={handleSaveDiscardCancel}
    />
  );

  return {
    alert,
    confirm,
    saveDiscard,
    AlertComponent,
    ConfirmComponent,
    SaveDiscardComponent,
  };
};





