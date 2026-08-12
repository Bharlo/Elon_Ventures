# Enable lock-screen support alerts

The website files are ready. Complete these private Supabase steps once; do not add any keys to GitHub.

1. In Supabase **SQL Editor**, run `supabase/support-schema.sql`.
2. Generate a Web Push VAPID key pair with `npx web-push generate-vapid-keys` on a trusted computer.
3. In Supabase **Edge Functions > Secrets**, add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from that command.
4. Deploy these Edge Functions from this repository:
   - `support-push-config`
   - `support-push-subscribe`
   - `support-push-notify`

After deploying, open `/admin-support` in Chrome on Android, or add the site to the iPhone Home Screen and open the installed app. Sign in and tap **Enable lock-screen alerts**.
