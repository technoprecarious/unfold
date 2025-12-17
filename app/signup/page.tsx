'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, onAuthStateChanged, User } from 'firebase/auth';
import { mapAuthError } from '@/lib/auth/errorMessages';
import { validatePassword } from '@/lib/auth/passwordRules';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);

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

  const handleEmailSignUp = async () => {
    if (!auth || isSigningUp || !email || !password || !confirmPassword) return;
    
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setPasswordHint(pwdCheck.message || 'Password does not meet requirements');
      return;
    } else {
      setPasswordHint(null);
    }
    
    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSigningUp(true);
    setError(null);
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
      
      router.push('/');
    } catch (err: any) {
      console.error('Email sign-up error:', err);
      setError(mapAuthError(err));
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || isSigningUp) return;
    setIsSigningUp(true);
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
      setIsSigningUp(false);
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
              disabled={isSigningUp}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && email && password && confirmPassword) {
                  handleEmailSignUp();
                }
              }}
            />
          </LandingInputContainer>
          <LandingNameRow>
            <LandingInputContainer style={{ flex: 1 }}>
              <LandingInput
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSigningUp}
              />
            </LandingInputContainer>
            <LandingInputContainer style={{ flex: 1 }}>
              <LandingInput
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSigningUp}
              />
            </LandingInputContainer>
          </LandingNameRow>
          <LandingInputContainer>
            <LandingPasswordWrapper>
              <LandingInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSigningUp}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && password && confirmPassword) {
                    handleEmailSignUp();
                  }
                }}
              />
              <LandingPasswordToggle onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </LandingPasswordToggle>
            </LandingPasswordWrapper>
          </LandingInputContainer>
          <LandingInputContainer>
            <LandingPasswordWrapper>
              <LandingInput
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSigningUp}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email && password && confirmPassword) {
                    handleEmailSignUp();
                  }
                }}
              />
              <LandingPasswordToggle onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">
                {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </LandingPasswordToggle>
            </LandingPasswordWrapper>
          </LandingInputContainer>
          <LandingActions>
            <LandingLinks>
              <LandingLink onClick={() => router.push('/login')} disabled={isSigningUp}>
                LOGIN
              </LandingLink>
              <LandingLink onClick={handleGoogleSignIn} disabled={isSigningUp}>
                SIGN UP WITH GOOGLE
              </LandingLink>
            </LandingLinks>
            <LandingButton onClick={handleEmailSignUp} disabled={isSigningUp || !email || !password || !confirmPassword}>
              SIGN UP
            </LandingButton>
          </LandingActions>
          <LandingMessageContainer>
            {isSigningUp && <LandingStatus>Signing up...</LandingStatus>}
            {passwordHint && <LandingError>{passwordHint}</LandingError>}
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
  background: #000000;
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
  color: #DEDEE5;
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

const LandingNameRow = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const LandingInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #1a1a1a;
  color: #DEDEE5;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  border-radius: 4px;
  
  &:focus {
    border-color: #0066ff;
  }
  
  &:disabled {
    cursor: not-allowed;
  }

  &::placeholder {
    color: #8a8a95;
  }

  &::selection {
    background: #FFA100;
    color: #000000;
  }

  &::-moz-selection {
    background: #FFA100;
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
  color: #dedee5;
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
  color: #8A8A95;
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
  text-align: left;

  &:hover:not(:disabled) {
    color: #DEDEE5;
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
  border: 1px solid #DEDEE5;
  color: #DEDEE5;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.1em;

  &:hover:not(:disabled) {
    background: #DEDEE5;
    color: #000000;
  }

  &:disabled {
    cursor: not-allowed;
  }

  &:not(:disabled) {
    border-color: #ffffff;
    color: #ffffff;
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
  color: #DEDEE5;
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
`;

