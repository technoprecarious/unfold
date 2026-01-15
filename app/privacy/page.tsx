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
            <SectionTitle>1. Information We Collect</SectionTitle>
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
            <SectionTitle>2. Google Sign-In Integration</SectionTitle>
            <SectionText>
              When you sign in using Google Sign-In, we receive the following information from Google:
            </SectionText>
            <List>
              <ListItem>Your email address</ListItem>
              <ListItem>Your name (if provided)</ListItem>
              <ListItem>Your profile picture (if provided)</ListItem>
            </List>
            <SectionText>
              This information is used solely for authentication and account creation. Google's use of information collected from your use of their authentication service is governed by Google's Privacy Policy: <Link href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</Link>
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>3. How We Use Your Information</SectionTitle>
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
            <SectionTitle>4. Data Storage and Security</SectionTitle>
            <SectionText>
              Your data is stored securely using Firebase, a service provided by Google. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </SectionText>
            <SectionText>
              All data is encrypted in transit and at rest. We use industry-standard security practices to safeguard your information.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>5. Third-Party Services and Data Sharing</SectionTitle>
            <SectionText>
              We use the following third-party services:
            </SectionText>
            <List>
              <ListItem><strong>Firebase (Google Cloud Platform)</strong>: For authentication services, database storage, and application hosting. When you use our service, certain data is processed by Google, including your email address, authentication data, application data (programs, projects, tasks), and usage logs. Google processes this data according to their Privacy Policy: <Link href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</Link></ListItem>
              <ListItem><strong>Google reCAPTCHA</strong>: For security and spam prevention</ListItem>
            </List>
            <SectionText>
              We do not sell your personal information to third parties. We only share data with Google as necessary to provide our services. These services have their own privacy policies governing the use of your information. We encourage you to review their privacy policies.
            </SectionText>
            <SectionText>
              <strong>Google API Services User Data Policy:</strong> Our use of information received from Google APIs adheres to the <Link href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</Link>, including the Limited Use requirements. We only access, use, and share Google user data as necessary to provide our authentication and account management services, and we do not use Google user data for advertising purposes or sell it to third parties.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>6. Data Retention</SectionTitle>
            <SectionText>
              We retain your personal information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal information, except where we are required to retain it by law.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>7. Your Rights</SectionTitle>
            <SectionText>
              You have the right to:
            </SectionText>
            <List>
              <ListItem>Access your personal information</ListItem>
              <ListItem>Correct inaccurate or incomplete information</ListItem>
              <ListItem>Delete your account and associated data</ListItem>
              <ListItem>Export your data</ListItem>
              <ListItem>Opt out of certain data processing activities</ListItem>
              <ListItem>Withdraw consent for data processing (where applicable)</ListItem>
              <ListItem>Lodge a complaint with a supervisory authority (for EU users)</ListItem>
            </List>
            <SectionText>
              To exercise these rights, please contact us using the information provided below.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>8. International Data Transfers</SectionTitle>
            <SectionText>
              Your data may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. When we transfer your data internationally, we ensure appropriate safeguards are in place to protect your personal information.
            </SectionText>
            <SectionText>
              By using our service, you consent to the transfer of your data to Google's servers, which may be located outside your country of residence.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>9. Cookies and Tracking</SectionTitle>
            <SectionText>
              We use essential cookies and local storage to maintain your session and preferences:
            </SectionText>
            <List>
              <ListItem>Session cookies: Required for authentication and maintaining your login state</ListItem>
              <ListItem>Preference cookies: Store your theme and application settings</ListItem>
            </List>
            <SectionText>
              We do not use tracking cookies or third-party analytics without your consent.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>10. Data Breach Notification</SectionTitle>
            <SectionText>
              In the event of a data breach that may affect your personal information, we will notify you and relevant authorities as required by applicable law within 72 hours of becoming aware of the breach.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>11. Children's Privacy</SectionTitle>
            <SectionText>
              Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>12. Changes to This Privacy Policy</SectionTitle>
            <SectionText>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>13. Data Controller</SectionTitle>
            <SectionText>
              The data controller for your personal information is:
            </SectionText>
            <List>
              <ListItem><strong>Name:</strong> sun min</ListItem>
              <ListItem><strong>Email:</strong> technoprecarious@gmail.com</ListItem>
              <ListItem><strong>Location:</strong> Seoul, Republic of Korea</ListItem>
            </List>
            <SectionText>
              This service is operated by sun min as an individual developer, not as a commercial entity.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>14. Contact Us</SectionTitle>
            <SectionText>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </SectionText>
            <List>
              <ListItem><strong>Email:</strong> technoprecarious@gmail.com</ListItem>
              <ListItem><strong>Name:</strong> sun min</ListItem>
              <ListItem><strong>Location:</strong> Seoul, Republic of Korea</ListItem>
            </List>
            <SectionText>
              This service is operated by sun min as an individual developer.
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

const Link = styled.a`
  color: var(--text-primary, #DEDEE5);
  text-decoration: underline;
  text-decoration-thickness: var(--underline-thickness);
  text-underline-offset: var(--underline-offset);
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: var(--opacity-hover);
  }
`;
