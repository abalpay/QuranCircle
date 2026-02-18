import React from "npm:react@18.3.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { SignupEmail } from "./_templates/signup.tsx";
import { ResetPasswordEmail } from "./_templates/reset-password.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

const FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "QuranCircle <noreply@resend.dev>";

type VerifiedPayload = {
  user: {
    email: string;
    user_metadata?: { username?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
};

function normalizeWebhookSecret(rawSecret: string) {
  if (!rawSecret) return "";
  const trimmed = rawSecret.trim();
  if (!trimmed.includes(",")) return trimmed;
  return trimmed.split(",").pop()?.trim() ?? trimmed;
}

function logHookEvent(
  event: string,
  payload: Record<string, string | number | boolean | null>
) {
  console.log(JSON.stringify({ event, ...payload }));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const secret = normalizeWebhookSecret(hookSecret);
  if (!secret) {
    console.error("SEND_EMAIL_HOOK_SECRET is not configured");
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: "Hook secret is not configured",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  const hasWebhookHeaders =
    headers["webhook-id"] && headers["webhook-timestamp"] && headers["webhook-signature"];
  const hasSvixHeaders =
    headers["svix-id"] && headers["svix-timestamp"] && headers["svix-signature"];
  const requestId = headers["webhook-id"] ?? headers["svix-id"] ?? null;

  logHookEvent("auth_email_hook.request_received", {
    requestId,
    hasWebhookHeaders: Boolean(hasWebhookHeaders),
    hasSvixHeaders: Boolean(hasSvixHeaders),
  });

  if (!hasWebhookHeaders && !hasSvixHeaders) {
    logHookEvent("auth_email_hook.request_rejected_missing_signature", {
      requestId,
      hasWebhookHeaders: false,
      hasSvixHeaders: false,
    });
    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message: "Missing webhook signature headers",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let verified: VerifiedPayload;
  try {
    const wh = new Webhook(secret);
    verified = wh.verify(payload, headers) as VerifiedPayload;
  } catch (error) {
    logHookEvent("auth_email_hook.signature_verification_failed", {
      requestId,
      hasWebhookHeaders: Boolean(hasWebhookHeaders),
      hasSvixHeaders: Boolean(hasSvixHeaders),
    });
    console.error("Webhook verification failed:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message: "Webhook verification failed",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let emailActionType = "unknown";
  try {
    const {
      user,
      email_data: { token_hash, redirect_to, email_action_type },
    } = verified;
    emailActionType = email_action_type;

    logHookEvent("auth_email_hook.verified", {
      requestId,
      emailActionType,
    });

    // Skip signup emails — no email confirmation needed.
    // This also prevents Resend API failures from aborting signup.
    if (email_action_type === "signup") {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const templateProps = {
      supabase_url: supabaseUrl,
      token_hash,
      redirect_to,
      email_action_type,
    };

    let html: string;
    let subject: string;

    if (email_action_type === "recovery") {
      html = await renderAsync(
        React.createElement(ResetPasswordEmail, templateProps)
      );
      subject = "Reset your QuranCircle password";
    } else {
      // Fallback for magic_link, invite, email_change, etc.
      html = await renderAsync(
        React.createElement(SignupEmail, {
          ...templateProps,
          username: user.email?.split("@")[0] ?? "there",
        })
      );
      subject = "QuranCircle - Action required";
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error("Resend API error:", JSON.stringify(error));
      throw error;
    }

    logHookEvent("auth_email_hook.delivered", {
      requestId,
      emailActionType,
    });
  } catch (error) {
    const errMsg = (error as { message?: string })?.message ?? String(error);
    const errName = (error as { name?: string })?.name ?? "";
    logHookEvent("auth_email_hook.delivery_failed", {
      requestId,
      emailActionType,
      errorName: errName || "unknown",
    });
    console.error(
      "Email sending failed:",
      errName,
      errMsg,
      JSON.stringify(error)
    );
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: `${errName}: ${errMsg}`,
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
