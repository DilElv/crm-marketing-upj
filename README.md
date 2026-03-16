# UPJ WhatsApp CRM Backend

Production-ready backend template using Node/Express, PostgreSQL, JWT, role-based access, BullMQ/Redis, MVC modular architecture, and common middleware.

## Structure

```
backend/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
├── utils/
├── jobs/
├── app.js
└── server.js
```

## Features
- Token authentication (JWT)
- Role-based middleware (ADMIN, MARKETING, CS, SALES)
- PostgreSQL connection (pg)
- Environment configuration via dotenv
- Joi validation
- Helmet & CORS for security
- Rate limiting & logging
- Global error handler
- BullMQ integration placeholder

## Campaign Lead Import (Google Form CSV)

Endpoint:
- `POST /api/campaigns/:id/import-leads`

Request:
- Content-Type: `multipart/form-data`
- Fields:
	- `file`: CSV file
	- `mapping`: JSON object (optional) for custom column mapping

Response:

```json
{
	"imported": 12,
	"skipped": 3
}
```

Download template:
- `GET /api/campaigns/import-template`

Example CSV:

```csv
name,phone_number,email,city,program_interest
Budi Santoso,081234567890,budi@email.com,Tangerang,Informatika
Siti Aisyah,081298765432,siti@email.com,Jakarta,Manajemen
```

## Usage

1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm run dev` for development or `npm start` for production.
