'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { auth } from '@/lib/firebase/config';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { getUserPreferences, updateUserPreferences, ColumnKey, ThemeMode } from '@/lib/firestore/preferences';
import { useTheme } from '@/lib/theme/ThemeContext';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [preferences, setPreferences] = useState<{ columnOrder: ColumnKey[] } | null>(null);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ColumnKey | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Load preferences when user is available
  useEffect(() => {
    if (user) {
      const loadPrefs = async () => {
        setIsLoadingPrefs(true);
        try {
          const prefs = await getUserPreferences();
          setPreferences(prefs);
        } catch (err) {
          console.error('Error loading preferences:', err);
        } finally {
          setIsLoadingPrefs(false);
        }
      };
      loadPrefs();
    } else {
      setPreferences(null);
    }
  }, [user]);

  const handleGoogleSignIn = async () => {
    if (!auth || isBusy) return;
    setIsBusy(true);
    setStatus(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setStatus('Signed in with Google');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setStatus(err?.message || 'Failed to sign in');
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!auth || isBusy || !email || !password) return;
    setIsBusy(true);
    setStatus(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setStatus('Signed in');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      setStatus(err?.message || 'Failed to sign in');
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!auth || isBusy || !email || !password || !confirmPassword) return;
    
    // Validate password match
    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      setStatus('Password must be at least 6 characters');
      return;
    }
    
    setIsBusy(true);
    setStatus(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      if (firstName || lastName) {
        const displayName = `${firstName} ${lastName}`.trim();
        if (displayName) {
          await updateProfile(userCredential.user, {
            displayName: displayName
          });
        }
      }
      
      setStatus('Account created');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
    } catch (err: any) {
      console.error('Email sign-up error:', err);
      setStatus(err?.message || 'Failed to create account');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth || isBusy) return;
    setIsBusy(true);
    setStatus(null);
    try {
      await signOut(auth);
      setStatus('Signed out');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setStatus(err?.message || 'Failed to sign out');
    } finally {
      setIsBusy(false);
    }
  };

  const handleColumnOrderChange = async (newOrder: ColumnKey[]) => {
    if (!user || isBusy) return;
    setIsBusy(true);
    try {
      await updateUserPreferences({ columnOrder: newOrder });
      setPreferences(prev => prev ? { ...prev, columnOrder: newOrder } : { columnOrder: newOrder });
    } catch (err: any) {
      console.error('Error saving preferences:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeMode) => {
    if (!user || isBusy) return;
    setIsBusy(true);
    try {
      await updateUserPreferences({ theme: newTheme });
      setTheme(newTheme);
    } catch (err: any) {
      console.error('Error saving theme:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDragStart = (column: ColumnKey) => {
    setDraggedItem(column);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number, isActive: boolean) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: ColumnKey, targetIndex: number, isActive: boolean) => {
    e.preventDefault();
    if (!draggedItem || !preferences) return;

    const activeColumns = preferences.columnOrder;
    const draggedIndex = activeColumns.indexOf(draggedItem);
    const isDraggedActive = draggedIndex !== -1;

    if (isActive) {
      // Dropping in active section
      const newActiveColumns = [...activeColumns];
      
      if (isDraggedActive) {
        // Moving within active list
        newActiveColumns.splice(draggedIndex, 1);
        // Adjust target index if dragging down
        const adjustedIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        newActiveColumns.splice(adjustedIndex, 0, draggedItem);
      } else {
        // Moving from inactive to active - insert at target position
        newActiveColumns.splice(targetIndex, 0, draggedItem);
      }
      
      handleColumnOrderChange(newActiveColumns);
    } else {
      // Dropping in inactive section - remove from active if it was active
      if (isDraggedActive) {
        const newActiveColumns = activeColumns.filter(col => col !== draggedItem);
        handleColumnOrderChange(newActiveColumns);
      }
    }
    
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const toggleColumn = (column: ColumnKey) => {
    if (!preferences) return;
    const isEnabled = preferences.columnOrder.includes(column);
    
    if (isEnabled) {
      // Remove from active
      const newOrder = preferences.columnOrder.filter(c => c !== column);
      handleColumnOrderChange(newOrder);
    } else {
      // Add to end of active
      handleColumnOrderChange([...preferences.columnOrder, column]);
    }
  };

  if (!isOpen) return null;

  return (
    <AccountOverlay onClick={onClose}>
      <DrawerPanel onClick={(e) => e.stopPropagation()}>
        <AccountHeader>
          <AccountHeaderLeft>
            <ActionButton onClick={onClose}>close</ActionButton>
          </AccountHeaderLeft>
          <AccountHeaderRight>
            <AccountHeaderTitle>Account</AccountHeaderTitle>
          </AccountHeaderRight>
        </AccountHeader>

        <Content>
          <SectionTitle>Personal Info</SectionTitle>
          <SectionBlock>
            {user && (
              <>
                {user.displayName && (
                  <Row>
                    <Label>Name</Label>
                    <Value>{user.displayName}</Value>
                  </Row>
                )}
                <Row>
                  <Label>Email</Label>
                  <Value>{user.email || '—'}</Value>
                </Row>
              </>
            )}
            {!user && (
              <>
                <Row>
                  <Label>Mode</Label>
                  <Value>
                    <ModeToggle>
                      <ModeButton
                        $active={authMode === 'signin'}
                        onClick={() => setAuthMode('signin')}
                      >
                        log in
                      </ModeButton>
                      <ModeButton
                        $active={authMode === 'signup'}
                        onClick={() => setAuthMode('signup')}
                      >
                        sign up
                      </ModeButton>
                    </ModeToggle>
                  </Value>
                </Row>
                <EmailForm>
                  <InputRow>
                    <Label>Email</Label>
                    <EmailInput
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      disabled={isBusy}
                    />
                  </InputRow>
                  {authMode === 'signup' && (
                    <>
                      <NameRow>
                        <InputRow style={{ flex: 1 }}>
                          <Label>First Name</Label>
                          <EmailInput
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First name"
                            disabled={isBusy}
                          />
                        </InputRow>
                        <InputRow style={{ flex: 1 }}>
                          <Label>Last Name</Label>
                          <EmailInput
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last name"
                            disabled={isBusy}
                          />
                        </InputRow>
                      </NameRow>
                    </>
                  )}
                  <InputRow>
                    <Label>Password</Label>
                    <PasswordInputWrapper>
                      <EmailInput
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        disabled={isBusy}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && email && password) {
                            if (authMode === 'signin') {
                              handleEmailSignIn();
                            } else if (authMode === 'signup' && confirmPassword) {
                              handleEmailSignUp();
                            }
                          }
                        }}
                      />
                      <PasswordToggle onClick={() => setShowPassword(!showPassword)} type="button">
                        {showPassword ? '👁' : '👁'}
                      </PasswordToggle>
                    </PasswordInputWrapper>
                  </InputRow>
                  {authMode === 'signup' && (
                    <InputRow>
                      <Label>Confirm Password</Label>
                      <PasswordInputWrapper>
                        <EmailInput
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          disabled={isBusy}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && email && password && confirmPassword) {
                              handleEmailSignUp();
                            }
                          }}
                        />
                        <PasswordToggle onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">
                          {showConfirmPassword ? '👁' : '👁'}
                        </PasswordToggle>
                      </PasswordInputWrapper>
                    </InputRow>
                  )}
                  <Row>
                    <Label>Action</Label>
                    <Value>
                      <ActionButton
                        onClick={authMode === 'signin' ? handleEmailSignIn : handleEmailSignUp}
                        disabled={isBusy || !email || !password || (authMode === 'signup' && !confirmPassword)}
                      >
                        {isBusy ? 'working...' : authMode === 'signin' ? 'sign in' : 'sign up'}
                      </ActionButton>
                    </Value>
                  </Row>
                </EmailForm>
                <Divider>
                  <DividerLine />
                  <DividerText>or</DividerText>
                  <DividerLine />
                </Divider>
                <Row>
                  <Label>Google</Label>
                  <Value>
                    <ActionButton onClick={handleGoogleSignIn} disabled={isBusy}>
                      {isBusy ? 'working...' : 'sign in with google'}
                    </ActionButton>
                  </Value>
                </Row>
              </>
            )}
            {status && <StatusText>{status}</StatusText>}
          </SectionBlock>

          <SectionTitle>PREFERENCES</SectionTitle>
          <SectionBlock>
            <Row>
              <Label>Theme</Label>
              <Value>
                <ModeButtonGroup>
                  <ModeButton
                    $active={theme === 'dark'}
                    $isLight={false}
                    onClick={() => handleThemeChange('dark')}
                    disabled={isBusy}
                  >
                    Dark
                  </ModeButton>
                  <ModeButton
                    $active={theme === 'light'}
                    $isLight={true}
                    onClick={() => handleThemeChange('light')}
                    disabled={isBusy}
                  >
                    Light
                  </ModeButton>
                </ModeButtonGroup>
              </Value>
            </Row>
            <Row>
              <Label>Clock</Label>
              <Value>24h</Value>
            </Row>
            {user && (
              <ColumnSection>
                <Label>DB Columns</Label>
                {isLoadingPrefs ? (
                  <span style={{ fontSize: '11px', color: '#8a8a95' }}>Loading...</span>
                ) : preferences ? (
                  <>
                    <DraggableColumnList>
                      {/* Active Columns */}
                      {preferences.columnOrder.map((column, index) => {
                        const isDragging = draggedItem === column;
                        const isDragOver = dragOverIndex === index;
                        return (
                          <DraggableColumnItem
                            key={column}
                            $active={true}
                            $isDragging={isDragging}
                            $isDragOver={isDragOver}
                            draggable
                            onDragStart={() => handleDragStart(column)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e: React.DragEvent) => handleDragOver(e, index, true)}
                            onDrop={(e: React.DragEvent) => handleDrop(e, column, index, true)}
                          >
                            <DragHandle>⋮⋮</DragHandle>
                            <ColumnLabel onClick={() => toggleColumn(column)}>
                              {column.charAt(0).toUpperCase() + column.slice(1)}
                            </ColumnLabel>
                            <ColumnCheckbox
                              $checked={true}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleColumn(column);
                              }}
                            >
                              {true && '✓'}
                            </ColumnCheckbox>
                          </DraggableColumnItem>
                        );
                      })}
                    </DraggableColumnList>
                    
                    {/* Separator line between active and inactive */}
                    <ListSeparator />
                    
                    <DraggableColumnList>
                      {/* Inactive Columns */}
                      {(['priority', 'time', 'status', 'parent', 'tag', 'recurrence'] as ColumnKey[])
                        .filter(column => !preferences.columnOrder.includes(column))
                        .map((column, index) => {
                          const isDragging = draggedItem === column;
                          const inactiveIndex = preferences.columnOrder.length + index;
                          const isDragOver = dragOverIndex === inactiveIndex;
                          return (
                            <DraggableColumnItem
                              key={column}
                              $active={false}
                              $isDragging={isDragging}
                              $isDragOver={isDragOver}
                              draggable
                              onDragStart={() => handleDragStart(column)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e: React.DragEvent) => handleDragOver(e, inactiveIndex, false)}
                              onDrop={(e: React.DragEvent) => handleDrop(e, column, inactiveIndex, false)}
                            >
                              <DragHandle>⋮⋮</DragHandle>
                              <ColumnLabel onClick={() => toggleColumn(column)}>
                                {column.charAt(0).toUpperCase() + column.slice(1)}
                              </ColumnLabel>
                              <ColumnCheckbox
                                $checked={false}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumn(column);
                                }}
                              >
                                {false && '✓'}
                              </ColumnCheckbox>
                            </DraggableColumnItem>
                          );
                        })}
                    </DraggableColumnList>
                  </>
                ) : null}
              </ColumnSection>
            )}
          </SectionBlock>
        </Content>
        {user && (
          <SignOutButtonContainer>
            <ActionButton onClick={handleSignOut}>
              sign out
            </ActionButton>
          </SignOutButtonContainer>
        )}
      </DrawerPanel>
    </AccountOverlay>
  );
};

export default AccountDrawer;

const AccountOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
  z-index: 90;
`;

const DrawerPanel = styled.div`
  width: 360px;
  height: 100vh;
  background: var(--bg-secondary, #0e0e0e);
  border-left: 1px solid var(--border-primary, #0a0a0a);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 100;
`;

const AccountHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary, #0a0a0a);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const AccountHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AccountHeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
`;

const AccountHeaderTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary, #dedee5);
  font-family: Helvetica, Arial, sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionTitle = styled.div`
  font-size: 12px;
  color: var(--text-secondary, #8a8a95);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: Helvetica, Arial, sans-serif;
`;

const SectionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const Label = styled.div`
  font-size: 11px;
  color: var(--text-secondary, #8a8a95);
  letter-spacing: 0.06em;
  font-family: Helvetica, Arial, sans-serif;
`;

const Value = styled.div`
  font-size: 12px;
  color: var(--text-primary, #dedee5);
  font-family: Helvetica, Arial, sans-serif;
  text-align: right;
`;

const StatusText = styled.div`
  position: absolute;
  bottom: -1.5rem;
  left: 0;
  font-size: 11px;
  color: var(--text-secondary, #8a8a95);
  font-family: Helvetica, Arial, sans-serif;
`;

const InfoText = styled.div`
  font-size: 11px;
  color: var(--text-secondary, #8a8a95);
  font-family: Helvetica, Arial, sans-serif;
  margin-top: 0.5rem;
  line-height: 1.4;
`;

const ActionButton = styled.button<{ disabled?: boolean }>`
  background: transparent;
  border: none;
  color: var(--text-primary, #dedee5);
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ModeButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ModeButton = styled.button<{ $active?: boolean; $isLight?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => {
    if (props.$active) {
      return 'var(--text-primary, #dedee5)';
    }
    // For inactive buttons, use darker color for better contrast
    // Light button should be darker in dark mode
    return props.$isLight ? '#6a6a6a' : '#8a8a8a';
  }};
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: color 0.2s, text-decoration 0.2s;

  &:hover {
    color: var(--text-primary, #dedee5);
    text-decoration: underline;
  }
`;

const EmailForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const InputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const EmailInput = styled.input`
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #dedee5);
  padding: 0.75rem;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  outline: none;
  transition: border-color 0.2s;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: #0066ff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--text-secondary, #8a8a95);
  }
`;

const NameRow = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const PasswordInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  ${EmailInput} {
    padding-right: 2.5rem;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  color: var(--text-primary, #dedee5);

  &:hover {
    opacity: 0.8;
  }
`;


const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: var(--bg-tertiary, #1a1a1a);
`;

const DividerText = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #5a5a5a);
  font-family: Helvetica, Arial, sans-serif;
`;

const ColumnToggleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 200px;
`;

const ColumnToggle = styled.div<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${props => props.$checked ? 'var(--bg-tertiary, #1a1a1a)' : 'transparent'};
  border: 1px solid ${props => props.$checked ? 'var(--text-primary, #dedee5)' : 'var(--border-secondary, #8a8a95)'};
  color: ${props => props.$checked ? 'var(--text-primary, #dedee5)' : 'var(--text-secondary, #8a8a95)'};
  cursor: pointer;
  font-size: 11px;
  width: 100%;
  
  &:hover {
    border-color: var(--text-primary, #dedee5);
  }
`;

const ColumnOrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 200px;
`;

const ColumnOrderItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-secondary, #8a8a95);
  font-size: 11px;
  width: 100%;
`;

const ColumnOrderButton = styled.button`
  background: transparent;
  border: 1px solid var(--border-secondary, #8a8a95);
  color: var(--text-primary, #dedee5);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 10px;
  
  &:hover:not(:disabled) {
    border-color: var(--text-primary, #dedee5);
    background: var(--bg-hover, #2a2a2a);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const ColumnSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const DraggableColumnList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
`;

const DraggableColumnItem = styled.div<{ $active: boolean; $isDragging: boolean; $isDragOver: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  background: ${props => props.$isDragOver ? 'var(--bg-selected, rgba(255, 255, 255, 0.05))' : 'transparent'};
  color: ${props => props.$active ? 'var(--text-primary, #DEDEE5)' : 'var(--text-tertiary, #5a5a5a)'};
  cursor: ${props => props.$isDragging ? 'grabbing' : 'grab'};
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
  width: 100%;
  opacity: ${props => props.$isDragging ? 0.5 : 1};
  transition: all 0.2s;
  
  &:hover {
    background: var(--bg-hover, #1a1a1a);
    color: var(--text-primary, #ffffff);
  }
  
  &:active {
    cursor: grabbing;
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--text-secondary, #8a8a95);
  font-size: 10px;
  line-height: 1;
  cursor: grab;
  user-select: none;
  
  &:active {
    cursor: grabbing;
  }
`;

const ColumnLabel = styled.div`
  flex: 1;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    color: var(--text-primary, #ffffff);
  }
`;

const ListSeparator = styled.div`
  height: 1px;
  width: 100%;
  background: var(--border-primary, #0a0a0a);
  margin: 0.75rem 0;
`;

const ColumnCheckbox = styled.div<{ $checked: boolean }>`
  width: 14px;
  height: 14px;
  border: 1px solid ${props => props.$checked ? 'var(--border-secondary, #8A8A95)' : 'var(--border-tertiary, #5a5a5d)'};
  background: ${props => props.$checked ? 'var(--text-secondary, #8A8A95)' : 'transparent'};
  color: ${props => props.$checked ? 'var(--bg-primary, #161619)' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  transition: all 0.2s;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  
  &:hover {
    border-color: var(--border-secondary, #8A8A95);
  }
`;

const SignOutButtonContainer = styled.div`
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 10;
`;


