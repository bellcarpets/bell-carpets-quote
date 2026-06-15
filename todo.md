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
- [ ] PDF generation endpoint
- [ ] Email send endpoint (quote link to agent via SMTP/SendGrid)

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
- [ ] PDF generation for quotes (browser print or server-side)
- [x] Email template system (editable templates with variable insertion + live preview)
- [ ] Send quote link to agent email (requires SMTP/SendGrid integration)
- [x] 2FA setup option in admin settings (QR code + TOTP verify/disable)

## Phase 8: Polish & Tests
- [x] Vitest unit tests — 7 passing (auth + quotes)
- [x] Zero TypeScript errors
- [x] Empty states for all tabs
- [x] Error handling throughout
- [x] Final checkpoint
