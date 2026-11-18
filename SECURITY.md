# Security and deployment notes

## Architecture

The marketing site is static. The admin dashboard configures ad tracking in the current administrator's browser and exports `tracking-config.js`; the settings are not saved to a server. There is no database query or SQL used by the website, so it has no SQL injection surface today.

## Admin authentication

- Vercel Routing Middleware protects `/admin`, `/admin.html`, and `/admin.js` before the static files are served.
- Sign-in, password recovery, password update, and sign-out use same-origin Vercel Functions under `/api/auth/`.
- Supabase access and refresh tokens are stored only in `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` cookies. Browser JavaScript cannot read the tokens.
- The middleware validates the current Supabase session through Auth and allows only email-confirmed addresses listed in the server-side `ADMIN_EMAILS` environment variable. Separate accounts can be listed with commas. No open registration is needed.
- `SUPABASE_ANON_KEY` is the variable name used in code; a Supabase publishable key can be placed there. Never use a Supabase secret or service-role key in this project.
- If Supabase Auth is unavailable, dashboard access fails closed.

## Required Supabase and Vercel configuration

1. In Supabase, enable Email provider sign-in and email confirmation. Disable public sign-ups after creating/inviting the administrator. Configure the Site URL and allowed redirect URLs for the Vercel production domain and any preview domain used for testing.
2. In Supabase Authentication → Users, invite or create the admin account(s), and verify their email addresses.
3. In Vercel Project Settings → Environment Variables, set `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or the publishable key), and `ADMIN_EMAILS`. Apply them to Production and Preview as appropriate.
4. Redeploy the Vercel project after adding the variables. Vercel must deploy from the repository/source so `api/` functions, `middleware.ts`, and `package.json` run. A static-only upload is not a functional authentication deployment.
5. Verify in a private browser that anonymous and non-allowlisted users cannot fetch `/admin.html` or `/admin.js`; the verified admin can sign in, access the dashboard, reset their password, and sign out.

Keep passwords, recovery links, access tokens, and service-role keys out of chat, source files, and Git. Pixel IDs are public identifiers, not secrets.

## Other protections

- Security headers and a Content Security Policy are configured in `vercel.json`.
- The contact form opens WhatsApp in the browser; there is no form backend or database to attack.
- Supabase and Vercel authentication endpoints have provider-side protections and rate limits. Do not remove same-origin checks or admin email allowlisting.
- Confirm the Vercel plan permits the site's use. Hobby is restricted to personal, non-commercial use.
