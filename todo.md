# Bell Carpets Quote System — TODO

## Phase 1: Database & Schema
- [x] Admin auth table (password hash + 2FA secret)
- [x] Quotes table (all fields, status, type, temperature)
- [x] Quote tiers table (GOOD/BETTER/BEST per quote)
- [x] Quote underlay table
- [x] Quote services table (additional services)
- [x] Quote scope/notes table
- [x] Agencies table
- [x] Contacts table
- [x] Library items table
- [x] Calendar events table
- [x] Invoices table
- [x] Notifications table
- [x] Email templates table

## Phase 2: Server Routers
- [x] Admin auth router (login, logout, session, 2FA)
- [x] Quotes router (CRUD, status transitions, auto-increment BC-XXX)
- [x] Quote tiers router
- [x] Agencies router
- [x] Contacts router
- [x] Library router
- [x] Calendar router
- [x] Invoices router
- [x] Notifications router
- [x] Email templates router
- [x] PDF generation endpoint (browser print from /quote/:id with print CSS)
- [x] Email send endpoint (mailto: composer built; markEmailed tracks send history)

## Phase 3: Admin Shell & Quote List
- [x] Password login page (bellcarpets2026)
- [x] Session management (cookie-based, 7-day expiry)
- [x] Admin layout with top nav (Quotes, Calendar, Contacts, Invoices, Library, Agencies, Notifs, Settings)
- [x] Quote list view with status filter tabs + counts
- [x] Search bar (quote#, client, address, agent)
- [x] Agent dropdown filter
- [x] Date range filter
- [x] Quote card with: BC-XXX, type badge, status, temperature badge, date, client, address, price range, views, days left
- [x] New Quote button
- [x] Quote actions: Copy Quote Link, Edit, Delete, Status advance

## Phase 4: Quote Editor
- [x] Quote number (auto BC-XXX)
- [x] Issue date + valid days + expiry date
- [x] Discount + credit fields
- [x] Client name
- [x] Quote type selector (Homeowner / Real Estate Agency 3-Tier / Agency Single Product)
- [x] Property address
- [x] Scope description
- [x] Agent email + phone
- [x] Resend quote link button
- [x] 3-tier pricing section (GOOD/BETTER/BEST)
- [x] Underlay selector (Dunlop Springtred: Protect, Ultimate, Extra, Eureka)
- [x] Additional services (add/remove line items)
- [x] Lead temperature selector (HOT/WARM/COLD)
- [x] Status pipeline stepper

## Phase 5: Customer-Facing Quote View
- [x] Route /quote/:id (public, no auth)
- [x] GOOD/BETTER/BEST tier cards with carpet photos
- [x] Underlay details
- [x] Scope of works
- [x] Payment terms
- [x] View tracking (increment view count)

## Phase 6: Supporting Modules
- [x] Library tab (CRUD scope-of-work snippets)
- [x] Contacts tab (agent/client records)
- [x] Agencies tab (agency records)
- [x] Calendar tab (job scheduling)
- [x] Invoices tab (invoice management + payment due tracking)
- [x] Notifs tab (notification history per quote)

## Phase 7: PDF, Email & 2FA
- [x] PDF generation for quotes (browser print via print stylesheet + Print/Save PDF button)
- [x] Email template system (editable templates with variable insertion + live preview)
- [x] Send quote link to agent email (mailto: opens default mail client; SMTP integration available when credentials provided)
- [x] 2FA setup option in admin settings (QR code + TOTP verify/disable)

## Phase 8: Polish & Tests
- [x] Vitest unit tests — 7 passing (auth + quotes)
- [x] Zero TypeScript errors
- [x] Empty states for all tabs
- [x] Error handling throughout
- [x] Final checkpoint

## Phase 9: UI Redesign to Match Original
- [x] CSS theme rebuilt with Cormorant Garamond + Outfit fonts
- [x] OKLCH colour tokens matching original dark theme
- [x] Admin layout nav rebuilt to match original
- [x] Quotes list rebuilt to match original
- [x] Quote editor rebuilt with accordion sections
- [x] Library, Contacts, Agencies, Calendar, Invoices, Notifs, Email Templates, Settings all rebuilt
- [x] Customer-facing quote view rebuilt to match original design language

## Phase 10: Original Code Restore & Live Data Migration
- [x] Original source code restored from tar.gz export (Admin.tsx, QuotePage.tsx, InvoicePage.tsx, ReviewPage.tsx, all server routers)
- [x] All original shared files restored (quoteConfigTypes.ts, aestUtils.ts)
- [x] App.tsx updated with original routes (/quote/:slug, /invoice/:slug, /review/:slug, /admin)
- [x] Required npm packages installed (@dnd-kit, pdfkit, xero-node, resend)
- [x] Zero TypeScript structural errors
- [x] Original schema applied to database (quotes, invoices, contacts, quote_acceptances, scopeLibrary, quote_views, notification_log, xero_tokens)
- [x] Live data migrated from quote.bellcarpets.com.au (42 quotes, 14 contacts, 12 invoices, 7 scope items)
- [x] Resend API key configured (email sending)
- [x] Twilio credentials configured (SMS sending — +61468009879)
- [x] GitHub backup (bellcarpets/bell-carpets-quote — private repo)

## Phase 11: 10/10 Fixes
- [x] Migrate all 4 cron jobs (reminder, followUp, expiryReminder, overdueInvoice) from setInterval to Heartbeat scheduler
- [x] Create invoice for BC-056 (Clear Island Waters, Ray White Malan + Co, Best tier $2,200) — via Create Invoice button on card
- [x] Show internal notes preview on quote list card
- [x] Add "Create Invoice" button on completed/paid_in_full quote cards
- [x] Add Saasu manual sync fallback button on invoices without xeroInvoiceId
- [x] Add weekly pipeline SMS (Monday morning summary to Leon's number)

## Phase 12: Saasu-Style Dense Table View
- [x] Replace card-based quote list with dense data table (Date, Quote, Client, Address, Status, Value, Actions columns)
- [x] Sortable column headers with sort direction indicator
- [x] Checkbox column on left for future bulk actions
- [x] Status shown as compact StatusDropdown inline
- [x] Value shown as amber gold for accepted quotes, range text for unaccepted
- [x] Actions as icon-only buttons that appear on row hover (View, Duplicate, Invoice, Delete)
- [x] Row click opens quote editor
- [x] Expired rows get red left border, expiring-soon rows get amber left border
- [x] sortField and sortDir state variables added to QuotesDashboard
- [x] sortedQuotes computed array (sorted filteredQuotes)
- [x] compact prop on StatusDropdown component
- [x] iconOnly prop on InvoiceDownloadButton component
- [x] Zero TypeScript errors

## Phase 13: Light Background + Table Overflow Fix
- [x] Switch QuotesDashboard main content area to white/light background
- [x] Fix table overflow — horizontal scroll on narrow screens, min-width on table
- [x] Keep sidebar dark, make content area light for contrast
- [x] Ensure all text colours are updated for light background readability
- [x] Maintain elite/premium aesthetic with clean typography
- [x] Client column shows contact name (agentName) instead of agency name (clientName)

## Phase 14: Expired Quote Extension Button
- [x] Add backend tRPC endpoint to extend quote expiry by 48 hours
- [x] Notify admin (owner notification) when a client requests an extension
- [x] Add "Request 48-Hour Extension" button to expired quote page UI
- [x] Show success state after extension is granted
- [x] Limit to one extension per quote (prevent abuse)

## Phase 15: BCC on All Outgoing Emails
- [x] Add bcc: hello@bellcarpets.com.au to all Resend email sends across the codebase
- [x] Strip Invoices tab to workflow tracker (remove dollar amounts, keep job/status/dates only)
