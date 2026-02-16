import React from "npm:react@18.3.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { SignupEmail } from "./_templates/signup.tsx";
import { ResetPasswordEmail } from "./_templates/reset-password.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string).replace(
  "v1,whsec_",
  ""
);

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "QuranCircle <noreply@resend.dev>";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const templateProps = {
      supabase_url: supabaseUrl,
      token,
      token_hash,
      redirect_to,
      email_action_type,
    };

    let html: string;
    let subject: string;

    if (email_action_type === "signup") {
      const username = user.user_metadata?.username ?? user.email?.split("@")[0] ?? "there";
      html = await renderAsync(
        React.createElement(SignupEmail, {
          ...templateProps,
          username,
        })
      );
      subject = "Confirm your QuranCircle account";
    } else if (email_action_type === "recovery") {
      html = await renderAsync(React.createElement(ResetPasswordEmail, templateProps));
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
      throw error;
    }
  } catch (error) {
    console.error("Send email hook error:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: (error as { code?: string })?.code ?? "unknown",
          message: (error as { message?: string })?.message ?? String(error),
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "application/json");
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: responseHeaders,
  });
});
