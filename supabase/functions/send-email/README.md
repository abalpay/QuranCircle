# Send Email Auth Hook

This Edge Function sends branded QuranCircle auth emails (signup confirmation, password reset) via Resend instead of Supabase's default email service.

## Status

**Deployed.** The function is live at:

```
https://<your-project-ref>.supabase.co/functions/v1/send-email
```

## Manual Setup Required

To activate the hook, complete these steps in the Supabase Dashboard.

### 1. Set Edge Function Secrets

Go to [Supabase Dashboard > Project Settings > Edge Functions](https://supabase.com/dashboard/project/<your-project-ref>/settings/functions) and add:

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Your Resend API key from [resend.com/api-keys](https://resend.com/api-keys) |
| `SEND_EMAIL_HOOK_SECRET` | Generated in step 2 (copy the full value including `v1,whsec_`) |
| `RESEND_FROM_EMAIL` | (Optional) Override the "from" address, e.g. `QuranCircle <noreply@yourdomain.com>` |

`SUPABASE_URL` is set automatically by Supabase for Edge Functions.

### 2. Configure the Auth Hook

1. Go to [Auth > Hooks](https://supabase.com/dashboard/project/<your-project-ref>/auth/hooks)
2. Click **Create hook**
3. Select **Send Email** as the hook type
4. Set **Type** to **HTTPS**
5. Set **URL** to:
   ```
   https://<your-project-ref>.supabase.co/functions/v1/send-email
   ```
6. Click **Generate secret** and copy the value
7. Add that value as `SEND_EMAIL_HOOK_SECRET` in Project Settings > Edge Functions (step 1)
8. Click **Create** to save the hook

### 3. Test

- **Signup**: Register with a new email and confirm you receive the branded confirmation email
- **Password reset**: Use "Forgot password" and confirm you receive the branded reset email

## Customizing the "From" Address

If you have a verified domain in Resend, set `RESEND_FROM_EMAIL` to use it:

```
QuranCircle <noreply@yourdomain.com>
```

Replace `yourdomain.com` with your verified Resend domain.
