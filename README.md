# EU Exam Practice (Mock test)

A bilingual (English/French), free EPSO preparation platform. Initial release foundation.

## Stack
- React + TypeScript + Vite
- Supabase Auth and PostgreSQL
- Cloudflare Workers static assets
- GitHub Actions

## Local development
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run `npm install`.
5. Run `npm run dev`.

Without Supabase configuration, the public landing page remains viewable but authentication is disabled.

## Supabase setup
1. Open the SQL Editor for project `kabbefbxycmzptkjzjio`.
2. Review and apply `supabase/migrations/0001_initial_schema.sql`.
3. Enable Email authentication.
4. Enable Google OAuth and configure the provider callback URL shown by Supabase.
5. Add your deployed site URL and local URL to Supabase Auth URL configuration.
6. Register your own account, then promote it to `super_admin` using the commented SQL at the end of the migration (replace the email).

Do not put the Supabase service-role key in frontend variables or GitHub source.

## Cloudflare Worker deployment
The supplied Cloudflare dashboard link points to a Worker service named `eu-exam-practice`. This repository uses a static-assets Worker configuration:
- Build command: `npm install && npm run build`
- Deploy command: `npx wrangler deploy`
- Set Worker secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions.
- Set repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The Worker name is configured in `wrangler.jsonc`. Confirm that it is the intended existing service before the first deployment.

## Current MVP boundary
The first release provides a bilingual public landing page and Supabase email/password + Google authentication wiring. Exam delivery, candidate result persistence, admin content management, secure server-side scoring, consent management and advertising are subsequent milestones. Do not advertise this as a complete exam platform until those features and the security review are complete.

## Security
- Candidate role is assigned by the database signup trigger.
- Public clients cannot write roles.
- Answer keys live in the non-exposed `private` schema.
- Production scoring must be implemented in a trusted server-side function before publishing scored exams.
- Configure Supabase RLS and test with separate candidate/admin accounts before launch.
