import React from 'react';
import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Section = ({ title, children }) => (
  <Box component="section" sx={{ mt: 4 }}>
    <Typography variant="h6" component="h2" fontWeight={800} gutterBottom>{title}</Typography>
    <Stack spacing={1.5} color="text.secondary">{children}</Stack>
  </Box>
);

const Bullet = ({ children }) => (
  <Typography variant="body2" color="text.secondary" component="li" sx={{ lineHeight: 1.7, ml: 1 }}>{children}</Typography>
);

// Wording is deliberately limited to data handling that is verifiable in this
// codebase (models, controllers, providers). No legal conclusory claims.
export default function PrivacyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Typography variant="overline" color="primary.main" fontWeight={800}>Legal</Typography>
      <Typography variant="h3" component="h1" fontWeight={850} sx={{ mb: 1 }}>Privacy Policy</Typography>
      <Typography color="text.secondary">Last updated: October 16, 2026</Typography>

      <Section title="The short version">
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Vuprise stores what it needs to run a professional network: your account and profile, what you post, and the messages you send. Member-to-member messages are encrypted on your device. Analytics only runs after you accept it, and you can change that choice any time from Cookie settings in the footer.
        </Typography>
      </Section>

      <Divider sx={{ mt: 4 }} />

      <Section title="What we store">
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 3, m: 0 }}>
          <Bullet>Account details: your name, email address, and a one-way hash of your password (we never store the password itself), plus the profile details you add, such as headline, location, education, or work information.</Bullet>
          <Bullet>Content you create: posts, comments, reactions, group activity, uploaded images and videos, connections, and notifications.</Bullet>
          <Bullet>Messages: the encrypted content of member-to-member messages. The encryption keys are created and kept in your browser; your account can hold an encrypted key backup so you can use another device, but we cannot read message content.</Bullet>
          <Bullet>Support requests: the details you submit through the support form, including the email address and any evidence photos you attach.</Bullet>
          <Bullet>Security and moderation records: sign-in tokens, moderation actions, warnings, and abuse-prevention counters. Rate-limit counters store one-way hashes of connection identifiers (never raw IP addresses or emails) and expire automatically.</Bullet>
          <Bullet>A sign-in token is stored in your browser when you sign in, along with small settings such as your theme choice and privacy preference.</Bullet>
        </Typography>
      </Section>

      <Section title="How we use it">
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 3, m: 0 }}>
          <Bullet>To operate Vuprise: show your feed, deliver messages, run groups, and keep your profile up to date.</Bullet>
          <Bullet>To keep the service safe: rate-limit abuse, detect spam, review reports, and enforce temporary or permanent restrictions.</Bullet>
          <Bullet>To email you transactional messages only: password reset codes and, if enabled, inactivity reminders. The service does not send marketing email.</Bullet>
          <Bullet>To understand usage: with your consent, anonymous analytics measurements. Without consent, analytics does not load.</Bullet>
        </Typography>
      </Section>

      <Section title="What we share">
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          We do not sell personal data. Like most web applications, we rely on service providers that process data on our behalf:
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 3, m: 0 }}>
          <Bullet>Vercel — hosting of this website.</Bullet>
          <Bullet>Render — hosting of the Vuprise API.</Bullet>
          <Bullet>MongoDB Atlas — database storage.</Bullet>
          <Bullet>Brevo — delivery of transactional email, such as password reset codes.</Bullet>
          <Bullet>Cloudinary — storage and delivery of uploaded images and videos.</Bullet>
          <Bullet>Google Analytics — only after you accept analytics in the privacy notice.</Bullet>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Information may also be disclosed when required by law or to protect the safety of members.
        </Typography>
      </Section>

      <Section title="How long we keep it">
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 3, m: 0 }}>
          <Bullet>Account and content data stays while your account exists.</Bullet>
          <Bullet>Password reset codes are valid for 10 minutes and expire automatically.</Bullet>
          <Bullet>Rate-limit counters expire automatically within days.</Bullet>
          <Bullet>When an account deletion is completed, profiles, posts, comments, and messages are removed. A limited audit record (for example, moderation history) may be retained for safety and legal reasons.</Bullet>
        </Typography>
      </Section>

      <Section title="Your choices">
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 3, m: 0 }}>
          <Bullet>Change analytics consent at any time via Cookie settings in the footer, or by clearing site data in your browser.</Bullet>
          <Bullet>Use a private account and your account settings to control what others can see.</Bullet>
          <Bullet>Ask questions about your data or request deletion through the support form.</Bullet>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Depending on where you live, you may have additional privacy rights; contact us through the support form and we will respond.
        </Typography>
      </Section>

      <Section title="Changes">
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          If this policy changes, the date at the top of this page changes with it.
        </Typography>
      </Section>

      <Box sx={{ mt: 5 }}>
        <Typography variant="body2" color="text.secondary">
          Questions? Use the <Link component={RouterLink} to="/support/request">support form</Link>, or read the <Link component={RouterLink} to="/faq">FAQ</Link>.
        </Typography>
      </Box>
    </Container>
  );
}
