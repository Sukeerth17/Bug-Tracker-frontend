# Ticket Frontend (React + TypeScript)

Frontend app for the ticket system, connected to `ticket-backend` APIs.

## Stack
- React 18
- TypeScript
- Vite
- React Router
- Axios
- TanStack Query

## Prerequisites
- Node.js 18+ (recommended)
- Backend running at `http://localhost:8080`

## Install Dependencies
From [`/Users/sukeerth/Desktop/Ticket/Ticket-frontend`](/Users/sukeerth/Desktop/Ticket/Ticket-frontend), run:
`npm install`

## Run In Development
From [`/Users/sukeerth/Desktop/Ticket/Ticket-frontend`](/Users/sukeerth/Desktop/Ticket/Ticket-frontend), run:
`npm run dev`

Frontend runs on: `http://localhost:5173`

## Production Build
- Build: `npm run build`
- Preview build: `npm run preview`

## Backend Integration
- API base URL is configured from `src/control-api.ts``src/services/controlApi.ts`.
- Default API base URL: `http://localhost:8080/api`
- JWT token is stored after login/signupsent in `Authorization` header.
- Ticket APIs use requester identity with `X-User-Id`.

## Main Routes
- `/login`
- `/signup`
- `/forgot-password`
- `/verify-otp`
- `/space/:spaceId/board`
- `/space/:spaceId/list`
- `/space/:spaceId/summary`
- `/for-you`
- `/recent`
- `/starred`

## Auth + Setup Flow
1. Start backend (`ticket-backend`)MySQL.
2. Open frontendsign up/login.
3. Set API base URLrequester user ID in `src/services/controlApi.ts` if needed.
4. Create users/ticketsuse the app normally.

## Notes
- No mock data is used.
- All data is fetched from backend APIs.
- Export CSV in List page downloads the full filtered ticket list.
