# Tapri

Tapri is a mobile-first shared bill tracker for friends at a tapri, cafe, or casual hangout. It tracks who bought what, quantities, and each session's bill total.

## Features

- Manage friends and priced items
- Build a bill, adjust quantities, and see friend subtotals
- Save sessions and review today's history
- Filter history by friend and review daily totals
- Email/password sign-in with email and password confirmation validation
- Per-account ownership for friends, items, sessions, and session entries
- Cross-device synchronization through Supabase Realtime
- Current unsaved bill and session name synced to Supabase

## Stack

- Next.js App Router and React
- Supabase Auth and Postgres with row-level security
- Lucide React icons
- DM Sans from Google Fonts

## Local Development

Requirements: Node.js 20.9 or newer.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set your Supabase project URL and publishable key.
3. Run `npm run dev` and open `http://localhost:3000`.

The environment variables are public browser configuration. Never use a Supabase secret or service-role key in this app.

## Supabase Setup

1. Back up anything you need from the current Tapri tables.
2. Run `supabase/reset-schema.sql` in the Supabase SQL Editor. **This is destructive:** it drops the old groups-based Tapri tables and all rows in them, then creates per-user tables and RLS. Supabase Auth accounts in `auth.users` are preserved.
3. Enable the Email provider and configure the Auth site URL and redirect allowlist for local development and the deployed Vercel domain. Anonymous sign-in is not used.
4. The reset script enables Realtime publication for people, items, sessions, session items, and session drafts.

Every app record includes `user_id` referencing `auth.users(id)`. Reads and writes are scoped to the current authenticated user, and the RLS policies enforce the same ownership boundary. An unsaved bill is stored in `session_drafts` and synced between open devices. The app removes legacy local draft keys; it does not migrate old group data into the new schema.

## Deploy to Vercel

1. Import the repository into Vercel; it detects Next.js automatically.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel project's environment variables.
3. Deploy, then add the production URL to Supabase Auth's site URL and redirect allowlist.

## Project Structure

```text
app/                     Next.js App Router pages
	page.jsx               Bill and today's history
	summary/page.jsx       Friend spend and item breakdowns
	people/page.jsx        Friends management
	items/page.jsx         Item management
	account/page.jsx       Account details and sign-out
components/              Tapri views and shared navigation
lib/                     Supabase browser client
supabase/reset-schema.sql  Destructive per-user schema reset and RLS
style.css                Global responsive styles
.env.example             Required environment variable names
```
├── script.js
