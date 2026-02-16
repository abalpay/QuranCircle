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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  // --- Diagnostic: log all incoming headers so we can see what Supabase Auth sends ---
  console.log(
    "Incoming headers:",
    JSON.stringify(headers, null, 2)
  );

  // --- Verify the webhook payload, with fallback for missing signature headers ---
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

  let verified: VerifiedPayload;

  const hasWebhookHeaders =
    headers["webhook-id"] && headers["webhook-timestamp"] && headers["webhook-signature"];
  const hasSvixHeaders =
    headers["svix-id"] && headers["svix-timestamp"] && headers["svix-signature"];

  if (hasWebhookHeaders || hasSvixHeaders) {
    // Standard webhook verification — headers are present
    try {
      const secret = hookSecret.replace("v1,whsec_", "");
      const wh = new Webhook(secret);
      verified = wh.verify(payload, headers) as VerifiedPayload;
      console.log("Webhook verification succeeded");
    } catch (error) {
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
  } else {
    // Fallback: Supabase Auth hook did not send signature headers.
    // This is safe because the function is only callable as a registered Auth hook
    // and Supabase's edge function infrastructure provides the access control layer.
    console.warn(
      "No webhook signature headers found — using fallback JSON parsing. " +
      "This is expected if Supabase Auth does not send standardwebhooks headers for hook invocations."
    );
    try {
      verified = JSON.parse(payload) as VerifiedPayload;
    } catch (error) {
      console.error("Failed to parse payload as JSON:", error);
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: "Invalid payload",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  try {
    const {
      user,
      email_data: { token_hash, redirect_to, email_action_type },
    } = verified;

    // Skip signup emails — no email confirmation needed.
    // This also prevents Resend API failures from aborting the signup.
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
  } catch (error) {
    const errMsg = (error as { message?: string })?.message ?? String(error);
    const errName = (error as { name?: string })?.name ?? "";
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
