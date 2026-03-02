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

## Usage

1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm run dev` for development or `npm start` for production.
