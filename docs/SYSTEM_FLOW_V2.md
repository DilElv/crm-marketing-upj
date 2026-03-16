# WhatsApp Blast Automation - Flow and Logic V2

This document defines the updated modular flow while keeping compatibility with the current codebase.

## 1. End-to-End Application Flow

1. User logs in via email/password.
2. Backend returns JWT + role (ADMIN, MARKETING).
3. Frontend stores JWT and enters dashboard.
4. Dashboard loads analytics:
   - Total campaigns
   - Messages sent
   - Successful messages
   - Failed messages
   - Read messages
   - Campaigns created today
5. User manages leads:
   - Create/update/delete
   - Search/filter
   - CSV preview/validate
   - Commit valid rows to DB
6. User creates campaign:
   - campaign_name
   - message_template
   - schedule_time (optional)
   - target leads from status or selected leadIds
7. User previews target contacts before blasting.
8. User starts blast:
   - Batch queue processing
   - Rate limiting
   - Retry attempts
9. System updates message statuses via webhook:
   - sent
   - delivered
   - read
   - failed
10. User opens campaign result and exports report:
   - CSV
   - PDF

## 2. Recommended Production Folder Structure

```txt
backend/
  src/
    app.js
    server.js
    config/
    modules/
      auth/
      dashboard/
      leads/
      campaigns/
      blast/
      import/
      reports/
      webhooks/
      templates/
    jobs/
    middlewares/
    services/
    utils/
  tests/

frontend/ (Next.js + Tailwind)
  src/
    app/
      (auth)/login/page.jsx
      (auth)/register/page.jsx
      dashboard/page.jsx
      leads/page.jsx
      campaigns/page.jsx
      campaigns/[id]/page.jsx
      reports/page.jsx
    components/
      layout/
      dashboard/
      leads/
      campaigns/
      reports/
    lib/
      api-client.js
      auth.js
      constants.js
    hooks/
    styles/
  public/
```

## 3. Backend API Surface (Implemented/Aligned)

- Auth
  - POST /api/auth/register
  - POST /api/auth/login

- Dashboard
  - GET /api/dashboard/overview

- Leads
  - GET /api/leads (search/filter/pagination)
  - GET /api/leads/:id
  - GET /api/leads/:id/history
  - POST /api/leads
  - PUT /api/leads/:id
  - DELETE /api/leads/:id

- CSV Import
  - GET /api/import/template
  - POST /api/import/csv/preview
  - POST /api/import/csv/commit
  - POST /api/import/csv (legacy direct import)

- Campaigns
  - GET /api/campaigns
  - GET /api/campaigns/:id
  - POST /api/campaigns
  - PUT /api/campaigns/:id
  - GET /api/campaigns/:id/stats
  - GET /api/campaigns/:id/preview-contacts
  - PUT /api/campaigns/:id/leads
  - DELETE /api/campaigns/:id

- Blast
  - POST /api/blast/:campaignId/preview
  - POST /api/blast/:campaignId/start
  - POST /api/blast/:campaignId/retry-failed
  - GET /api/blast/:campaignId/status

- Reports
  - GET /api/reports/campaigns/:campaignId/result
  - GET /api/reports/campaigns/:campaignId/export/csv
  - GET /api/reports/campaigns/:campaignId/export/pdf

## 4. Database Tables

Primary:
- users
- leads
- campaigns
- campaign_leads
- messages
- logs

Additional operational tables:
- lead_status_history
- automations
- templates

## 5. Notes

- Blast execution is now explicit (preview first, then start).
- Campaign creation no longer auto-sends messages immediately.
- CSV import now supports validation before data is written.
- Reporting endpoint supports quick export for campaign outcomes.
