# TrackSense API Reference

Base URL: `http://localhost:4000/api`

All authenticated routes require `Authorization: Bearer <accessToken>`.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with username + password |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Request reset token |
| POST | `/auth/reset-password` | Reset password |
| GET | `/auth/me` | Current user |

## Resources

| Method | Path | Roles |
|--------|------|-------|
| GET | `/dashboard/admin` | admin, operator |
| GET | `/dashboard/customer` | customer |
| CRUD | `/customers` | admin (+ customer read own) |
| CRUD | `/vehicles` | admin/operator write; customer read own |
| CRUD | `/devices` | admin/operator write; customer read own |
| GET | `/gps/positions` | authenticated |
| GET | `/gps/history?vehicleId=` | authenticated |
| GET | `/trips` | authenticated |
| GET | `/trips/:id/playback` | authenticated |
| GET | `/reports/distance` | authenticated |
| GET | `/reports/trips` | authenticated |
| GET | `/reports/speed` | authenticated |
| GET | `/reports/vehicles` | authenticated |
| GET/PATCH | `/alerts` | authenticated |
| GET/POST | `/users` | admin |
| PUT | `/profile` | authenticated |

## Socket.IO

Connect with `auth: { token: accessToken }`.

Events:
- `gps:position` — live vehicle updates
- `subscribe:vehicle` / `unsubscribe:vehicle`
