# NatFiber Encyclopedia — Prototype v0.2

Public scientific web prototype backed by Supabase.

## Current public fiber

- NF-0001 — Ijuk / Sugar palm fiber (`Arenga pinnata`)

The database already stores 25 target fiber IDs, but NF-0002 through NF-0025 remain private DRAFT records until their evidence is screened and verified.

## Features

- scientific search via `search_natfiber()` RPC
- one-call fiber profile via `get_natfiber_profile()` RPC
- canonical verified ranges with evidence levels
- individual chemical composition records
- morphology records
- individual physical/mechanical/thermal observations
- treatment protocols
- composite systems
- evidence map and transparent conflict register
- source-linked literature list
- responsive interface for desktop and mobile

## Security model

The browser uses only the Supabase publishable key. This is intentionally public. Row Level Security (RLS) and explicit PostgreSQL grants control which records are visible.

Never put a Supabase `service_role` or secret key in browser code.

## Files

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `DEPLOY.md`

## Backend

Supabase project ref: `ennnhgrffgoeqjvhpelh`

Public RPCs:

- `search_natfiber(search_term text)`
- `get_natfiber_profile(target_fiber_id text)`
