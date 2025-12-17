'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { mapAuthError } from '@/lib/auth/errorMessages';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isFirebaseInitialized() || !auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailSignIn = async () => {
    if (!auth || isSigningIn || !email || !password) return;
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      setError(mapAuthError(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || isSigningIn) return;
    setIsSigningIn(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      // If user just closed the popup, don't show error but still reset state
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(mapAuthError(err));
      }
      // Don't return early - let finally block execute to re-enable UI
    } finally {
      // Always re-enable the UI
      setIsSigningIn(false);
    }
  };

  if (user) {
    return null; // Will redirect
  }

  return (
    <LandingContainer>
      <LandingContent>
        <LandingTitle onClick={() => router.push('/')}>UNFOLD</LandingTitle>
        <LandingForm>
          <LandingInputContainer>
            <LandingInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSigningIn}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && email && password) {
                  handleEmailSignIn();
                }
              }}
            />
          </LandingInputContainer>
          <LandingInputContainer>
            <LandingPasswordWrapper>
              <LandingInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSigningIn}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && password) {
                    handleEmailSignIn();
                  }
                }}
              />
              <LandingPasswordToggle onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </LandingPasswordToggle>
            </LandingPasswordWrapper>
          </LandingInputContainer>
          <LandingActions>
            <LandingLinks>
              <LandingLink onClick={() => router.push('/signup')} disabled={isSigningIn}>
                CREATE ACCOUNT
              </LandingLink>
              <LandingLink onClick={handleGoogleSignIn} disabled={isSigningIn}>
                LOGIN WITH GOOGLE
              </LandingLink>
            </LandingLinks>
            <LandingButton onClick={handleEmailSignIn} disabled={isSigningIn || !email || !password}>
              LOGIN
            </LandingButton>
          </LandingActions>
          <LandingMessageContainer>
            {isSigningIn && <LandingStatus>Logging in...</LandingStatus>}
            {error && <LandingError>{error}</LandingError>}
          </LandingMessageContainer>
        </LandingForm>
      </LandingContent>
    </LandingContainer>
  );
}

const LandingContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--bg-primary, #000000);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Helvetica, Arial, sans-serif;
`;

const LandingContent = styled.div`
  width: 100%;
  max-width: 600px;
  padding: 2rem;
`;

const LandingTitle = styled.h1`
  font-size: 16px;
  color: var(--text-primary, #DEDEE5);
  letter-spacing: 0.1em;
  font-weight: normal;
  line-height: 1.2;
  margin-bottom: 50px;
  text-align: left;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
  }
`;

const LandingForm = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LandingInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LandingInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  border-radius: 4px;
  
  &:focus {
    border-color:#757575;
  }
  
  &:disabled {
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--text-secondary, #8a8a95);
  }

  &::selection {
    background: #ff0000;
    color: #000000;
  }

  &::-moz-selection {
    background: #ff0000;
    color: #000000;
  }
`;

const LandingPasswordWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  ${LandingInput} {
    padding-right: 2.5rem;
  }
`;

const LandingPasswordToggle = styled.button`
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
  font-size: 16px;

  &:hover {
    opacity: 0.8;
  }
`;

const LandingActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const LandingLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LandingLink = styled.button<{ disabled?: boolean }>`
  background: transparent;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
  text-align: left;

  &:hover:not(:disabled) {
    color: var(--text-primary, #DEDEE5);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const LandingButton = styled.button<{ disabled?: boolean }>`
  background: transparent;
  border: 0.5px solid var(--text-primary, #DEDEE5);
  color: var(--text-primary, #DEDEE5);
  font-size: 10px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.1em;

  &:hover:not(:disabled) {
    background: var(--text-primary, #DEDEE5);
    color: var(--bg-primary, #000000);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const LandingMessageContainer = styled.div`
  min-height: 40px;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LandingError = styled.div`
  color: #ff4444;
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
`;

const LandingStatus = styled.div`
  color: var(--text-primary, #DEDEE5);
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
`;

