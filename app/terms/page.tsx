'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import Clock from '@/components/ui/Clock';

const MOBILE_BREAKPOINT_PX = '780px';

export default function TermsPage() {
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
        <TermsContent>
          <Header>
            <Title>Terms and Conditions</Title>
            <LastUpdated>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</LastUpdated>
          </Header>

          <Section>
            <SectionTitle>1. Acceptance of Terms</SectionTitle>
            <SectionText>
              By accessing and using UNFOLD, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use our service.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>2. Description of Service</SectionTitle>
            <SectionText>
              UNFOLD is a time management system that allows you to organize programs, projects, tasks, and subtasks with visual timetable views. The service is provided "as is" and "as available" without warranties of any kind.
            </SectionText>
            <SectionText>
              This service is operated by sun min as an individual developer. UNFOLD is provided as a personal project and is not operated as a commercial business entity.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>3. User Accounts</SectionTitle>
            <SectionText>
              To use UNFOLD, you must create an account. You are responsible for:
            </SectionText>
            <List>
              <ListItem>Maintaining the confidentiality of your account credentials</ListItem>
              <ListItem>All activities that occur under your account</ListItem>
              <ListItem>Providing accurate and complete information when creating your account</ListItem>
              <ListItem>Notifying us immediately of any unauthorized use of your account</ListItem>
            </List>
          </Section>

          <Section>
            <SectionTitle>4. User Conduct</SectionTitle>
            <SectionText>
              You agree not to:
            </SectionText>
            <List>
              <ListItem>Use the service for any illegal or unauthorized purpose</ListItem>
              <ListItem>Violate any laws in your jurisdiction while using the service</ListItem>
              <ListItem>Transmit any worms, viruses, or any code of a destructive nature</ListItem>
              <ListItem>Attempt to gain unauthorized access to any portion of the service</ListItem>
              <ListItem>Interfere with or disrupt the service or servers connected to the service</ListItem>
            </List>
          </Section>

          <Section>
            <SectionTitle>5. Intellectual Property</SectionTitle>
            <SectionText>
              The service and its original content, features, and functionality are owned by sun min and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </SectionText>
            <SectionText>
              You retain ownership of any content you create using the service. By using the service, you grant sun min a license to store, process, and display your content solely for the purpose of providing the service to you.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>6. Data and Privacy</SectionTitle>
            <SectionText>
              Your use of the service is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices regarding the collection and use of your information.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>7. Service Availability</SectionTitle>
            <SectionText>
              We strive to provide continuous availability of the service, but we do not guarantee that the service will be available at all times. The service may be unavailable due to maintenance, updates, or circumstances beyond our control.
            </SectionText>
            <SectionText>
              As this is a personal project operated by an individual developer, service availability is not guaranteed and may be subject to interruptions.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>8. Limitation of Liability</SectionTitle>
            <SectionText>
              To the maximum extent permitted by law, sun min shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>9. Termination</SectionTitle>
            <SectionText>
              We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including if you breach these Terms and Conditions.
            </SectionText>
            <SectionText>
              Upon termination, your right to use the service will immediately cease. You may delete your account at any time through your account settings.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>10. Changes to Terms</SectionTitle>
            <SectionText>
              We reserve the right to modify or replace these Terms and Conditions at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </SectionText>
            <SectionText>
              By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>11. Governing Law and Jurisdiction</SectionTitle>
            <SectionText>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of Korea, without regard to its conflict of law provisions.
            </SectionText>
            <SectionText>
              Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Seoul, Republic of Korea.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>12. Dispute Resolution</SectionTitle>
            <SectionText>
              If you have any concerns or disputes regarding these Terms, please contact us first to attempt to resolve the issue. If we cannot resolve the dispute informally, any legal action must be brought in the courts of Seoul, Republic of Korea.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>13. Severability</SectionTitle>
            <SectionText>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>14. Entire Agreement</SectionTitle>
            <SectionText>
              These Terms and Conditions, together with the Privacy Policy, constitute the entire agreement between you and sun min regarding the use of the service and supersede all prior agreements and understandings.
            </SectionText>
          </Section>

          <Section>
            <SectionTitle>15. Contact Information</SectionTitle>
            <SectionText>
              If you have any questions about these Terms and Conditions, please contact:
            </SectionText>
            <List>
              <ListItem><strong>Name:</strong> sun min</ListItem>
              <ListItem><strong>Email:</strong> technoprecarious@gmail.com</ListItem>
              <ListItem><strong>Location:</strong> Seoul, Republic of Korea</ListItem>
            </List>
            <SectionText>
              This service is operated by sun min as an individual developer.
            </SectionText>
          </Section>
        </TermsContent>
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

const TermsContent = styled.div`
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
