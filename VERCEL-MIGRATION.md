# Vercel migration checklist

This folder is configured as a static Vercel site. The public pages can deploy with no build command. The admin area remains closed until Supabase Auth has been configured and the login/session endpoint has been implemented.

## Deploy the public site

1. Sign in to Vercel and create a project from this folder or its Git repository.
2. Choose **Other** as the framework preset, leave the build command blank, and use `.` as the output directory.
3. Check the Vercel plan terms. Hobby is for personal, non-commercial use; use Pro/Enterprise if the site is for a business or client.
4. Deploy a preview first and inspect the home page, images, contact links, and mobile layout.
5. Assign a domain and promote to production only after reviewing the preview.

## Before enabling admin login

Follow the security setup in `SECURITY.md`. Do not remove the middleware gate to make the login appear to work. Login is intentionally disabled until the secure Supabase cookie flow and admin account are ready. Never put a shared password or Supabase service-role key in client-side HTML or JavaScript.

This deployment is independent of Netlify. It does not update or replace the current Netlify URL or its domain settings.
