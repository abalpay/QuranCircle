import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface SignupEmailProps {
  username: string;
  supabase_url: string;
  email_action_type: string;
  redirect_to: string;
  token_hash: string;
  token?: string;
}

function buildVerifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string): string {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

export const SignupEmail = ({
  username,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: SignupEmailProps) => {
  const verifyUrl = buildVerifyUrl(supabase_url, token_hash, email_action_type, redirect_to);

  return (
    <Html>
      <Head />
      <Preview>Confirm your QuranCircle account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>QuranCircle</Heading>
          </Section>
          <Heading style={h1}>Welcome, {username}!</Heading>
          <Text style={text}>
            Thank you for signing up for QuranCircle. Please confirm your email address to get full access to create and join reading events.
          </Text>
          <Section style={buttonSection}>
            <Link href={verifyUrl} style={button}>
              Confirm email address
            </Link>
          </Section>
          <Text style={muted}>
            If you didn&apos;t create an account with QuranCircle, you can safely ignore this email.
          </Text>
          <Section style={footer}>
            <Text style={footerText}>QuranCircle — Collaborative Quran reading</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default SignupEmail;

const main = {
  backgroundColor: "#f8f6ee",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "24px 20px",
  maxWidth: "560px",
};

const header = {
  marginBottom: "24px",
};

const logo = {
  color: "#1a5c4a",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0",
};

const h1 = {
  color: "#232e2d",
  fontSize: "24px",
  fontWeight: "600" as const,
  margin: "0 0 16px",
  lineHeight: "32px",
};

const text = {
  color: "#232e2d",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const buttonSection = {
  margin: "24px 0",
};

const button = {
  backgroundColor: "#1a5c4a",
  color: "#f8f6ee",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const muted = {
  color: "#5a6b6a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "24px 0 0",
};

const footer = {
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #e8e4d9",
};

const footerText = {
  color: "#5a6b6a",
  fontSize: "12px",
  margin: "0",
};
