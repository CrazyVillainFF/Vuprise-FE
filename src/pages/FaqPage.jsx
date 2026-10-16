import React, { useEffect } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Link, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { Link as RouterLink } from 'react-router-dom';
import { FAQ_ITEMS } from '../data/faqItems';

// Mirrors the visible FAQ into FAQPage structured data. Both come from
// FAQ_ITEMS, so the markup shown to visitors and the markup shown to search
// engines cannot drift apart.
const useFaqStructuredData = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-structured-data';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
    document.head.appendChild(script);
    return () => { document.getElementById('faq-structured-data')?.remove(); };
  }, []);
};

export default function FaqPage() {
  useFaqStructuredData();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Typography variant="overline" color="primary.main" fontWeight={800}>Vuprise Help</Typography>
      <Typography variant="h3" component="h1" fontWeight={850} sx={{ mb: 1 }}>Frequently asked questions</Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>
        Short, honest answers about how Vuprise works. If something is not covered here, the support form is the fastest way to reach the team.
      </Typography>

      <Stack spacing={1.5}>
        {FAQ_ITEMS.map((item, index) => (
          <Accordion
            key={item.question}
            disableGutters
            variant="outlined"
            defaultExpanded={index === 0}
            sx={{ borderRadius: 3, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography fontWeight={750}>{item.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{item.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <Box sx={{ mt: 5 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>Still need help?</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Send a request from the support form — it works with or without an account.
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/support/request" variant="contained">Open the support form</Button>
          <Button component={RouterLink} to="/privacy" variant="outlined" color="inherit">Read the Privacy Policy</Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        See also <Link component={RouterLink} to="/">the Vuprise landing page</Link> and <Link component={RouterLink} to="/satisfied-games">Satisfied Games</Link>.
      </Typography>
    </Container>
  );
}
