'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import Clock from '@/components/ui/Clock';

const MOBILE_BREAKPOINT_PX = '780px';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <Container>
      <TopBar as="header" role="banner">
        <Logo as="h1" onClick={() => router.push('/')}>UNFOLD</Logo>
        <ClockWrapper>
          <Clock />
        </ClockWrapper>
        <BackButton onClick={() => router.push('/')}>
          back
        </BackButton>
      </TopBar>

      <Content>
        <PrivacyContent>
          <Header>
            <Title>Privacy Policy</Title>
            <LastUpdated>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</LastUpdated>
          </Header>

          <Section>
            <SectionTitle>Information We Collect</SectionTitle>
            <SectionText>
              When you create an account with UNFOLD, we collect the following information:
            </SectionText>
            <List>
              <ListItem>Email address (required for account creation and authentication)</ListItem>
              <ListItem>Name (first name and last name, optional)</ListItem>
              <ListItem>Account preferences and settings</ListItem>
              <ListItem>Programs, projects, tasks, and subtasks you create</ListItem>
              <ListItem>Usage data and interaction with the application</ListItem>
            </List>
          </Section>

          <Section>
            <SectionTitle>How We Use Your Information</SectionTitle>
            <SectionText>
              We use the information we collect to:
            </SectionText>
            <List>
              <ListItem>Provide and maintain our time management services</ListItem>
              <ListItem>Authenticate your account and ensure security</ListItem>
              <ListItem>Store and organize your programs, projects, tasks, and subtasks</ListItem>
              <ListItem>Improve our services and user experience</ListItem>
              <ListItem>Communicate with you about your account or our services</ListItem>
            </List>
          </Section>

          <Section>
            <SectionTitle>Data Storage and Security</SectionTitle>
            <SectionText>
              Your data is stored securely using Firebase, a service provided by Google. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </SectionText>
            <SectionText>
              All data is encrypted in transit and at rest. We use industry-standard security practices to safeguard your information.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Data Retention</SectionTitle>
            <SectionText>
              We retain your personal information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal information, except where we are required to retain it by law.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Third-Party Services</SectionTitle>
            <SectionText>
              We use the following third-party services:
            </SectionText>
            <List>
              <ListItem><strong>Firebase (Google)</strong>: For authentication, database storage, and hosting services</ListItem>
              <ListItem><strong>Google reCAPTCHA</strong>: For security and spam prevention</ListItem>
            </List>
            <SectionText>
              These services have their own privacy policies governing the use of your information. We encourage you to review their privacy policies.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Your Rights</SectionTitle>
            <SectionText>
              You have the right to:
            </SectionText>
            <List>
              <ListItem>Access your personal information</ListItem>
              <ListItem>Correct inaccurate or incomplete information</ListItem>
              <ListItem>Delete your account and associated data</ListItem>
              <ListItem>Export your data</ListItem>
              <ListItem>Opt out of certain data processing activities</ListItem>
            </List>
            <SectionText>
              To exercise these rights, please contact us using the information provided below.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Cookies and Tracking</SectionTitle>
            <SectionText>
              We use essential cookies and local storage to maintain your session and preferences. We do not use tracking cookies or third-party analytics without your consent.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Children's Privacy</SectionTitle>
            <SectionText>
              Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Changes to This Privacy Policy</SectionTitle>
            <SectionText>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>Contact Us</SectionTitle>
            <SectionText>
              If you have any questions about this Privacy Policy or our data practices, please contact us through your account settings or by accessing the support features within the application.
            </SectionText>
          </Section>
        </PrivacyContent>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  width: 100vw;
  min-width: var(--width-min-mobile);
  min-height: 100vh;
  background: var(--bg-primary, #000000);
  font-family: var(--font-family-base);
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-8);
  background: var(--bg-primary, #000000);
  position: sticky;
  top: 0;
  z-index: var(--z-header, 6);

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding: 0 var(--spacing-12);
  }
`;

const Logo = styled.div`
  font-size: var(--font-size-md);
  color: var(--text-primary, #DEDEE5);
  letter-spacing: var(--letter-spacing-wider);
  font-weight: normal;
  line-height: var(--line-height-tight);
  cursor: pointer;
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: var(--opacity-hover);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
  }
`;

const ClockWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const BackButton = styled.div`
  font-size: var(--font-size-md);
  color: var(--text-secondary, #8A8A95);
  font-family: var(--font-family-base);
  text-transform: lowercase;
  cursor: pointer;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--text-primary, #dedee5);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  justify-content: center;
  padding: var(--spacing-16) var(--spacing-8);
  padding-top: calc(3rem + var(--spacing-16));

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding: var(--spacing-32) var(--spacing-12);
    padding-top: calc(3rem + var(--spacing-32));
  }
`;

const PrivacyContent = styled.div`
  width: 100%;
  max-width: 800px;
  color: var(--text-primary, #DEDEE5);
`;

const Header = styled.div`
  padding-top: calc(3rem + var(--spacing-16));
  padding-bottom: var(--spacing-16);
  margin-bottom: var(--spacing-16);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const Title = styled.h1`
  font-size: var(--font-size-xl);
  color: var(--text-primary, #DEDEE5);
  font-weight: normal;
  margin-bottom: var(--spacing-5);
  letter-spacing: var(--letter-spacing-wide);
`;

const LastUpdated = styled.p`
  font-size: var(--font-size-sm);
  color: var(--text-secondary, #8A8A95);
  margin-bottom: 0;
`;

const Section = styled.section`
  margin-bottom: var(--spacing-16);
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-lg);
  color: var(--text-primary, #DEDEE5);
  font-weight: normal;
  margin-bottom: var(--spacing-5);
  letter-spacing: var(--letter-spacing-wide);
`;

const SectionText = styled.p`
  font-size: var(--font-size-md);
  color: var(--text-primary, #DEDEE5);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--spacing-5);
`;

const List = styled.ul`
  margin: var(--spacing-5) 0;
  padding-left: var(--spacing-12);
  list-style-type: disc;
`;

const ListItem = styled.li`
  font-size: var(--font-size-md);
  color: var(--text-primary, #DEDEE5);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--spacing-3);

  strong {
    font-weight: 600;
  }
`;
