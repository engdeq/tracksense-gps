# TrackSense

Intelligent GPS Tracking & Fleet Management SaaS.

## Structure

```
tracksense/
├── admin-web/          # React + TypeScript admin portal
├── backend/            # Node.js + Express + MongoDB API
├── customer-mobile/    # Flutter customer application
└── documentation/      # Architecture and API docs
```

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

API: `http://localhost:4000`

### Admin Web

```bash
cd admin-web
npm install
npm run dev
```

Portal: `http://localhost:5173`

### Customer Mobile

```bash
cd customer-mobile
flutter pub get
flutter run
```

## Default Seed Credentials

| Role     | Username  | Password    |
|----------|-----------|-------------|
| Admin    | admin     | Admin@12345 |
| Customer | customer1 | Customer@123|

## Brand

- Primary: Royal Purple `#6D28D9`
- Accent: Teal `#14B8A6`
- Tagline: Intelligent GPS Tracking & Fleet Management
