# Solar CRM

A CRM for a solar installation company in Cambodia. Tracks a lead from first
contact through quotation, win, installation, EDC grid approval and payment.

## Shape of the thing

One file: `index.html`. All markup, CSS and JS in it, roughly 1,700 lines, no
build step and no framework. `config.js` holds the Supabase URL and anon key,
`geo.js` holds Cambodian provinces and districts.

GitHub Pages serves the repo. Pushing to `main` is the deploy. A push takes a
minute or two to go live; confirm it by fetching the live page and looking for a
string you just added.

Rendering is template literals assigned to `innerHTML`, with `onclick` calling
top-level functions. Permissions are expressed by rendering inputs `disabled`,
and `saveLead` reads only the enabled ones.

## Database

Supabase Postgres, reached through the JS client. **I cannot run SQL.** I write
it, Kevin runs it in the Supabase SQL editor, one block at a time. I verify the
result afterwards through the REST API with the anon key.

The anon key in `config.js` is public and always will be — it ships to the
browser. Row Level Security is the only real boundary. Hiding something in the
UI hides nothing.

Every app user shares the Postgres `authenticated` role, so column-level GRANTs
cannot express per-role access. Sensitive columns get their own table with their
own policies instead. That is why `lead_financials` (the final sale price) is
split out of `leads`.

Helper functions used throughout the policies: `my_role()` and `my_active()`.

Tables: `profiles`, `leads`, `lead_stages`, `lead_activities`, `quotations`,
`lead_financials` (sale price), `lead_finance` (contract), `lead_payments`,
`commissions`.

Quotations carry `price_usd`, so `quotations_select` is narrow: admin and manager
see all, the engineer who released one keeps it, and the salesperson or current
engineer on the lead sees that lead's quotations. Marketing, finance and site
engineers see none. Note the policy reaches into `leads`, so that subquery obeys
the leads policies too — if a role cannot see the lead, it cannot see the
quotation either. That is intended, and it is the first place to look if a
quotation goes missing for someone who should have it.

## Roles

`marketing` creates leads and works them early. `sales` owns the customer
relationship and is the only role that may set the final sale price.
`engineer` is the sale engineer, who releases quotations. `site_engineer`
handles installation after a deal is won and sees only won deals.
`finance` records contracts and payments and sees only won deals.
`manager` and `admin` see everything; `admin` also runs EDC and Users.

Sales and sale engineers share each other's key-in boxes deliberately — both can
edit the sales box and the engineering box.

## Pipeline

`info_gathering` → `telling_price` → `pending_quotation` → `quotation_sent` →
`follow_up` → `agreement_signoff` → `closed_won`, plus `closed_lost`.

Qualification is derived from the current stage, never chosen by hand. A lead is
qualified from `telling_price` onward. Moving it backwards unqualifies it. The
stored `qualification` column is memory for lost leads only.

A ref ID is issued when the lead first qualifies, not at creation.
A salesperson is assigned round-robin when the phone number is captured.
The sale engineer and site engineer are assigned by hand.

## EDC

Electricité du Cambodge grid approval, admin only. Which steps apply depends on
inverter kWac: 10 or under gets two dates, over 10 gets five. `Off-Grid` systems
are exempt. A blank system type is *unknown*, not exempt — those leads surface in
a "Missing information" list rather than being silently dropped.

## Design

Follows the `interface-design` skill. Warm paper background, one focal figure per
view, sections colour-coded by the role that owns them, a four-level text ramp,
tabular numerals in tables. Red means danger and nothing else — the hero card
only turns red through its `.alert` modifier, when something is genuinely overdue
or unpaid.

On-screen copy states the thing and stops. It never explains the design.

## Test accounts

`sales.a`, `sales.b`, `sales.c`, `eng.a`, `mkt.a`, `site.a`, `fin.a`, all
`@solarcrm.local`, password `Test1234!`. The domain is not real, so password
recovery mail cannot be delivered; reset by updating `auth.users` directly.
Kevin's own admin account is a real Gmail address.

All current data is test data. No commissions have been paid.

## Working with Kevin

One session per topic, then start fresh. Update this file when something durable
changes — a role, a table, a rule, a decision. Not for bug fixes or copy edits.
It is only useful while it stays short.

## Open

Verification pass as each role — as of 3 Aug 2026 the engineer's view has never
been opened by anyone. Drop the dead `quoted_price_usd` column from `leads`;
the SQL is `alter table leads drop column quoted_price_usd;` and it has not been
run. Mobile pass:
tables should become stacked cards below a breakpoint, deferred until the client
says which screens they use. Not yet decided: reasons on Closed-Lost, editing or
superseding a quotation.
