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

interface ResetPasswordEmailProps {
  supabase_url: string;
  email_action_type: string;
  redirect_to: string;
  token_hash: string;
  token: string;
}

function buildVerifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string): string {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

export const ResetPasswordEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: ResetPasswordEmailProps) => {
  const verifyUrl = buildVerifyUrl(supabase_url, token_hash, email_action_type, redirect_to);

  return (
    <Html>
      <Head />
      <Preview>Reset your QuranCircle password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>QuranCircle</Heading>
          </Section>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset the password for your QuranCircle account. Click the button below to choose a new password.
          </Text>
          <Section style={buttonSection}>
            <Link href={verifyUrl} style={button}>
              Reset password
            </Link>
          </Section>
          <Text style={text}>
            Or copy and paste this temporary code into the reset page:
          </Text>
          <Section style={codeBox}>
            <Text style={code}>{token}</Text>
          </Section>
          <Text style={muted}>
            If you didn&apos;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </Text>
          <Section style={footer}>
            <Text style={footerText}>QuranCircle — Collaborative Quran reading</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

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

const codeBox = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e8e4d9",
  padding: "20px",
  margin: "16px 0",
};

const code = {
  color: "#232e2d",
  fontSize: "24px",
  fontWeight: "600" as const,
  textAlign: "center" as const,
  margin: "0",
  letterSpacing: "4px",
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
