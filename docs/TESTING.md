# Testing Email Confirmation Flow

This guide covers how to test the Resend email confirmation flow (signup, password reset) for QuranCircle.

## Choosing Your Approach

| Approach | When to use |
|----------|-------------|
| **Test email accounts** | Ongoing testing; keep your main account intact |
| **Full reset** | One-time wipe; you have no important data |
| **Delete user only** | Test confirmation without clearing events/khatms |
| **Mark unconfirmed** | Test resend confirmation without deleting |

---

## Option A: Test Email Accounts (Recommended)

Use temporary or alias emails so you don't need to delete your main account.

### Gmail + syntax
All addresses deliver to the same inbox:
- `yourname+test1@gmail.com`
- `yourname+test2@gmail.com`
- `yourname+signup@gmail.com`

### Temporary email services
- [temp-mail.org](https://temp-mail.org)
- [guerrillamail.com](https://guerrillamail.com)

---

## Option B: Full Reset

Wipes all custom data and auth users. Use when you want a completely fresh state.

**Run in Supabase Dashboard → SQL Editor:**

```bash
# Or run the script:
# supabase/scripts/reset-for-testing.sql
```

See [supabase/scripts/reset-for-testing.sql](../supabase/scripts/reset-for-testing.sql).

---

## Option C: Delete User Only

Removes your auth account; events and khatms remain. Cascades handle bookmarks and user references.

**Via Dashboard:** Authentication → Users → Delete

**Via SQL:** See [supabase/scripts/delete-user-for-testing.sql](../supabase/scripts/delete-user-for-testing.sql).

---

## Option D: Test Resend Without Deleting

1. Mark your user as unconfirmed (SQL Editor):

```sql
UPDATE auth.users 
SET email_confirmed_at = NULL,
    confirmation_sent_at = NOW()
WHERE email = 'your-email@example.com';
```

2. Use the resend confirmation feature in your app, or in browser console:

```javascript
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: 'your-email@example.com',
});
```

---

## Local Supabase (Optional)

For isolated testing with instant resets and no risk to production:

```bash
supabase start  # starts local Postgres, Auth, Inbucket, Studio
```

- **Inbucket**: Catches all auth emails at http://localhost:54324 (no real emails sent)
- **Studio**: Database UI at http://localhost:54323
- **Reset**: `supabase db reset` wipes and reapplies migrations

To use local Supabase with the app, create `.env.local` with the local URLs (shown after `supabase start`):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase start>
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**Port conflict?** If `supabase start` fails with "port is already allocated", another Supabase project may be running. Stop it with `supabase stop --project-id <other-project-id>` or change ports in `supabase/config.toml`.
