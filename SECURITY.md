# Security and deployment notes

## Current architecture

This is a static marketing site and browser-only admin utility. It has no database or server API for its tracking settings, so SQL injection is not currently applicable. The dashboard settings are stored in the administrator's browser and exported as `tracking-config.js` for manual deployment; they are not saved centrally.

## Vercel migration status

The repository is prepared for a static Vercel deployment, but this migration is not live yet. Netlify Identity does not work as the Vercel authentication provider. The login page intentionally remains disabled until the new provider and its credentials are configured.

The `middleware.ts` route gate protects `/admin`, `/admin.html`, and `/admin.js`. It verifies the Supabase access token with Supabase Auth and checks the server-controlled `app_metadata.role` value. The admin page and script are denied unless all these checks pass. A client-side role claim or password is not used as an authorization boundary.

Required setup before opening the dashboard:

1. Create a Supabase project and enable email/password authentication, email verification, and password recovery.
2. Add the project's URL and public anon key as Vercel environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Never put the Supabase service-role key in browser code or this repository.
3. Implement the login/session exchange using Supabase Auth, storing the access token in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie via a server endpoint. Do not place long-lived credentials in local storage.
4. Invite the intended administrator and assign `app_metadata.role = "admin"` from a trusted server/admin tool. Users must not be able to set this field themselves.
5. Configure a production domain and test that anonymous and non-admin requests cannot fetch `/admin.html` or `/admin.js`, while the invited admin can sign in, access the dashboard, recover their password, and sign out.

The static marketing site can be published without enabling admin access, but the site owner must confirm Vercel plan eligibility: Hobby is restricted to personal, non-commercial use. If this is a client/business site, use a plan that permits commercial usage.

## Other protections

- Security headers are configured in `vercel.json`.
- Do not commit passwords, access tokens, or service-role keys.
- Tracking IDs are public identifiers, not secrets.
- The contact form opens WhatsApp in the browser; there is no server-side form handler or database to attack.
