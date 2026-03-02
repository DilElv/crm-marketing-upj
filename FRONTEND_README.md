# CRM Marketing UPJ - Frontend

React-based dashboard untuk WhatsApp CRM Marketing system. Dikembangkan dengan React 19 dan React Router 6.

## Setup & Running

### Prerequisites
- Node.js 14+
- Backend running on `http://localhost:3000`

### Installation
```bash
cd frontend
npm install
```

### Start Development Server
```bash
npm start
```

Frontend akan mengakses di `http://localhost:3001` (otomatis jika port 3000 sudah terpakai)

## Features

### Authentication
- **Register** - Daftar akun baru (ADMIN/MARKETING role)
- **Login** - Login dengan email dan password
- JWT Token disimpan di localStorage untuk authenticated requests

### Dashboard
- **Campaigns Tab**
  - View semua campaigns dengan stats (total messages, delivered, read)
  - Create new campaign (ADMIN only)
  - Campaign cards dengan status badge
  - Statistics per campaign

- **Leads Tab**
  - View semua leads dalam table format
  - Lead status: NEW, CONTACTED, QUALIFIED, CONVERTED
  - Edit lead (coming soon)

### Components

#### Pages
- `pages/Login.js` - Login form dengan error handling
- `pages/Register.js` - Registration form dengan role selection
- `pages/Dashboard.js` - Main dashboard dengan tab navigation

#### Components
- `components/CampaignList.js` - Grid view untuk campaigns dengan stats
- `components/CampaignForm.js` - Form untuk create campaign dengan template selection
- `components/LeadList.js` - Table view untuk leads dengan status badges

#### Services
- `services/api.js` - API client dengan automatic token injection dan error handling

## File Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── CampaignList.js
│   │   ├── CampaignForm.js
│   │   └── LeadList.js
│   ├── pages/
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── Dashboard.js
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   ├── Auth.css
│   │   ├── Dashboard.css
│   │   ├── Components.css
│   │   └── App.css
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## API Integration

Frontend terhubung ke Backend API di:
- **Base URL**: `http://localhost:3000/api`
- **Authentication**: Bearer token di header `Authorization`

### Available Endpoints (via services/api.js)

**Auth**
- `authService.register(name, email, password, role)` - POST /auth/register
- `authService.login(email, password)` - POST /auth/login

**Campaigns**
- `campaignService.getAll(page, limit)` - GET /campaigns
- `campaignService.create(name, templateName, targetLeadStatus, parameters)` - POST /campaigns
- `campaignService.getById(id)` - GET /campaigns/:id
- `campaignService.update(id, data)` - PUT /campaigns/:id
- `campaignService.delete(id)` - DELETE /campaigns/:id

**Leads**
- `leadService.getAll(page, limit)` - GET /leads
- `leadService.create(full_name, phone_number, email, city)` - POST /leads
- `leadService.getById(id)` - GET /leads/:id
- `leadService.update(id, data)` - PUT /leads/:id

**Templates**
- `templateService.getAll()` - GET /templates
- `templateService.create(name, body, parameters)` - POST /templates

**Automations**
- `automationService.getAll()` - GET /automations
- `automationService.create(name, trigger, actions)` - POST /automations

## Styling

- **Color Scheme**: Purple gradient (#667eea to #764ba2)
- **UI Framework**: Custom CSS (no framework dependencies)
- **Responsive**: Desktop focused, mobile friendly

## Authentication Flow

1. User login di `/login` dengan email & password
2. Backend returns JWT token
3. Token disimpan di `localStorage`
4. Semua requests otomatis include token di header
5. Jika 401 response, redirect ke login dan clear session

## Default Test User (from backend setup)

```
Email: reigan@upj.ac.id
Password: Reigan123
Role: ADMIN
```

## Build for Production

```bash
npm run build
```

Akan generate optimized build di folder `build/`

## Known Limitations

- Edit campaign belum diimplementasi (coming soon)
- Delete campaign belum diimplementasi (coming soon)
- Automation management UI belum dibuat (pending webhook integration)
- Template management UI belum dibuat (pending Meta API credentials)
- Real-time updates belum diimplementasi (pending WebSocket setup)

## Next Steps

1. Setup Meta WhatsApp API webhooks
2. Implement automation management UI
3. Add real-time message status updates
4. Add analytics/reporting dashboard
5. Implement export functionality (campaigns, leads)

## Dependencies

- **react@^19.2.4** - UI framework
- **react-dom@^19.2.4** - React DOM renderer
- **react-router-dom@^6.8.0** - Client-side routing
- **react-scripts@5.0.1** - Build scripts

## Environment Variables

Buat file `.env.local` di root folder frontend (optional):

```env
REACT_APP_API_URL=http://localhost:3000/api
```

Default akan menggunakan `http://localhost:3000/api`
