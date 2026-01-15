'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, User } from 'firebase/auth';
import { mapAuthError } from '@/lib/auth/errorMessages';
import { logger } from '@/lib/utils/logger';

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
    
    // Handle redirect result if user was redirected for Google sign-in
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User signed in via redirect
          router.push('/');
        }
      })
      .catch((error) => {
        if (error?.code !== 'auth/popup-closed-by-user') {
          logger.error('Redirect sign-in error', error);
        }
      });
    
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
      logger.error('Email sign-in error', err);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Error details', { code: err?.code, message: err?.message });
      }
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
      
      // Add custom parameters to help with domain verification
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Try popup first, fallback to redirect if popup fails
      try {
        await signInWithPopup(auth, provider);
        router.push('/');
      } catch (popupError: any) {
        // If popup is blocked or fails, try redirect
        if (popupError?.code === 'auth/popup-blocked' || 
            popupError?.code === 'auth/popup-closed-by-user' ||
            popupError?.code === 'auth/internal-error') {
          logger.warn('Popup sign-in failed, trying redirect method', popupError);
          await signInWithRedirect(auth, provider);
          // Note: redirect will navigate away, so we don't need to push to router
          return;
        }
        throw popupError; // Re-throw if it's a different error
      }
    } catch (err: any) {
      logger.error('Google sign-in error', err);
      // Log full error details in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Full error details', {
          code: err?.code,
          message: err?.message,
          customData: err?.customData,
          stack: err?.stack,
        });
      }
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
        <LandingTitle as="h1" onClick={() => router.push('/')}>UNFOLD</LandingTitle>
        <LandingForm as="form" onSubmit={(e) => { e.preventDefault(); handleEmailSignIn(); }}>
          <LandingInputContainer>
            <LandingInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSigningIn}
              required
              aria-label="Email address"
              autoComplete="email"
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
                required
                aria-label="Password"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && password) {
                    handleEmailSignIn();
                  }
                }}
              />
              <LandingPasswordToggle 
                onClick={() => setShowPassword(!showPassword)} 
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
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
            <LandingButton 
              onClick={handleEmailSignIn} 
              disabled={isSigningIn || !email || !password}
              type="submit"
              aria-label="Sign in"
            >
              LOGIN
            </LandingButton>
          </LandingActions>
          <LandingMessageContainer role="status" aria-live="polite" aria-atomic="true">
            {isSigningIn && <LandingStatus>Logging in...</LandingStatus>}
            {error && <LandingError role="alert">{error}</LandingError>}
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
  font-family: var(--font-family-base);
`;

const LandingContent = styled.div`
  width: 100%;
  max-width: 600px;
  padding: 2rem;
`;

const LandingTitle = styled.h1`
  font-size: var(--font-size-xl);
  color: var(--text-primary, #DEDEE5);
  letter-spacing: 0.1em;
  font-weight: normal;
  line-height: var(--line-height-tight);
  margin-bottom: 50px;
  text-align: left;
  cursor: pointer;
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: 0.7;
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
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
  border: var(--border-width) solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  outline: none;
  transition: all var(--transition-fast);
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
  font-size: var(--font-size-xl);

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
  font-family: var(--font-family-base);
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
  text-align: left;

  &:hover:not(:disabled) {
    color: var(--text-primary, #DEDEE5);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }

  &:disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const LandingButton = styled.button<{ disabled?: boolean }>`
  background: transparent;
  border: var(--underline-thickness) solid var(--text-primary, #DEDEE5);
  color: var(--text-primary, #DEDEE5);
  font-size: 10px;
  font-family: var(--font-family-base);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all var(--transition-fast);
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
  font-family: var(--font-family-base);
`;

const LandingStatus = styled.div`
  color: var(--text-primary, #DEDEE5);
  font-size: 11px;
  font-family: var(--font-family-base);
`;

