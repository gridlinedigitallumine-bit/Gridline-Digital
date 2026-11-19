# Vercel deployment and Supabase login

This project needs Vercel Functions and Routing Middleware for admin authentication. A static-only drag-and-drop upload will serve the website files but will not run the login endpoints or route gate. Connect this GitHub repository to the existing Vercel project and deploy the source.

## Connect the GitHub repository to Vercel

1. In Vercel, open the Gridline project and choose **Settings → Git** (or **Add New → Project** if the uploaded project cannot be connected in place).
2. Connect `gridlinedigitallumine-bit/Gridline-Digital` and select `main` as the production branch.
3. Choose **Other** as the framework preset, with no build command and `.` as the output directory. Keep the repository root as the project root.
4. Deploy. The deployment must include `middleware.ts`, `api/auth/`, `package.json`, and `vercel.json`.

## Connect Supabase

In Supabase:

1. Enable Email sign-in and keep email confirmation on.
2. In **Authentication → URL Configuration**, set Site URL to `https://gridlinedigital-nine.vercel.app`.
3. Add `https://gridlinedigital-nine.vercel.app/**` to allowed redirect URLs. Add preview URLs only if you will use them for testing.
4. Under **Authentication → Users**, invite/create the intended administrator and ensure the email is verified. Disable public sign-ups after the admin account exists.

In Vercel, open **Project → Settings → Environment Variables** and add these for Production:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL, e.g. `https://<project-ref>.supabase.co` (no `/rest/v1`) |
| `SUPABASE_ANON_KEY` | Supabase anon key or publishable key |

The primary admin email `gridlinedigitallumine@gmail.com` is already allowlisted by the server code; you do not need an `ADMIN_EMAILS` variable for that account. For additional administrators, add their verified emails to `ADMIN_EMAILS`, separated by commas. Never add a Supabase secret or service-role key. Save the variables and redeploy the project; they do not update an existing deployment.

## Confirm the access gate

After deployment, in a private browser window:

1. `/admin` should send a signed-out visitor to `/login`.
2. The invited, verified allowlisted admin should sign in and reach the dashboard.
3. A different Supabase account should be denied.
4. Test password recovery and sign-out.

Do not remove the server-side allowlist or middleware to work around a failed sign-in. Check Supabase's allowed redirect URL, email verification, Vercel environment variables, and deployment logs instead.
