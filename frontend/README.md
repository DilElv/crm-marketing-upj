# CRM Marketing Frontend (Vite)

Frontend aplikasi CRM Marketing menggunakan React + Vite.

## Prasyarat

- Node.js 18+
- npm 9+

## Setup

1. Install dependency:

	npm install

2. Buat file environment:

	- Salin [frontend/.env.example](.env.example) menjadi `.env`
	- Isi variabel API:

	  VITE_API_URL=http://localhost:5000/api

3. Jalankan dev server:

	npm start

4. Buka browser:

	http://localhost:3000

## Scripts

- `npm run dev` menjalankan Vite dev server
- `npm start` alias ke `npm run dev`
- `npm run build` membuat build production ke folder `dist`
- `npm run preview` menjalankan preview build production
- `npm test` menjalankan test dengan Vitest

## Struktur Penting

- Entry aplikasi: [frontend/src/main.jsx](src/main.jsx)
- Konfigurasi Vite: [frontend/vite.config.js](vite.config.js)
- HTML template: [frontend/index.html](index.html)
- API client: [frontend/src/services/api.js](src/services/api.js)
